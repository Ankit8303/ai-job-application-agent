import { WorkflowState, WorkflowCheckpoint, SubmissionLogEntry } from "./types";

export type { WorkflowState };

export interface StateMachineContext {
  applicationId: string;
  userId: string;
  portalId?: string;
  jobUrl?: string;
}

export interface TransitionEvent {
  from: WorkflowState;
  to: WorkflowState;
  timestamp: string;
  reason?: string;
  meta?: Record<string, any>;
}

export type TransitionListener = (event: TransitionEvent) => void;

/**
 * Valid Transitions Matrix:
 * Maps each state to the set of permissible successor states.
 */
const VALID_TRANSITIONS: Record<WorkflowState, Set<WorkflowState>> = {
  INITIALIZING: new Set([
    "NAVIGATING",
    "CHECKING_AUTH",
    "FAILED",
    "CANCELLED",
  ]),
  NAVIGATING: new Set([
    "CHECKING_AUTH",
    "AUTH_REQUIRED",
    "INSPECTING_APPLICATION",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  CHECKING_AUTH: new Set([
    "AUTHENTICATED",
    "AUTH_REQUIRED",
    "REAUTHENTICATION_REQUIRED",
    "INSPECTING_APPLICATION",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  AUTH_REQUIRED: new Set([
    "WAITING_FOR_USER_LOGIN",
    "VERIFYING_AUTH",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  WAITING_FOR_USER_LOGIN: new Set([
    "VERIFYING_AUTH",
    "AUTHENTICATED",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  VERIFYING_AUTH: new Set([
    "AUTHENTICATED",
    "WAITING_FOR_USER_LOGIN",
    "AUTH_REQUIRED",
    "REAUTHENTICATION_REQUIRED",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  AUTHENTICATED: new Set([
    "INSPECTING_APPLICATION",
    "NAVIGATING",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  INSPECTING_APPLICATION: new Set([
    "FILLING_FORM",
    "AUTH_REQUIRED",
    "REAUTHENTICATION_REQUIRED",
    "AWAITING_USER_REVIEW",
    "COMPLETED", // e.g. already submitted
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  FILLING_FORM: new Set([
    "AWAITING_USER_REVIEW",
    "SUBMITTING",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  AWAITING_USER_REVIEW: new Set([
    "SUBMITTING",
    "FILLING_FORM",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  SUBMITTING: new Set([
    "VERIFYING_SUBMISSION",
    "COMPLETED",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  VERIFYING_SUBMISSION: new Set([
    "COMPLETED",
    "FAILED",
    "PAUSED",
    "CANCELLED",
  ]),
  PAUSED: new Set([
    "NAVIGATING",
    "CHECKING_AUTH",
    "WAITING_FOR_USER_LOGIN",
    "VERIFYING_AUTH",
    "AUTHENTICATED",
    "INSPECTING_APPLICATION",
    "FILLING_FORM",
    "SUBMITTING",
    "CANCELLED",
    "FAILED",
  ]),
  REAUTHENTICATION_REQUIRED: new Set([
    "WAITING_FOR_USER_LOGIN",
    "VERIFYING_AUTH",
    "PAUSED",
    "FAILED",
    "CANCELLED",
  ]),
  COMPLETED: new Set([]), // Terminal
  FAILED: new Set(["INITIALIZING"]), // Can be restarted
  CANCELLED: new Set([]), // Terminal
};

export class AuthStateMachine {
  private currentState: WorkflowState;
  private readonly context: StateMachineContext;
  private history: TransitionEvent[] = [];
  private listeners: TransitionListener[] = [];
  private currentCheckpoint: WorkflowCheckpoint | null = null;

  constructor(context: StateMachineContext, initialState: WorkflowState = "INITIALIZING") {
    this.context = context;
    this.currentState = initialState;
  }

  public getState(): WorkflowState {
    return this.currentState;
  }

  public getContext(): StateMachineContext {
    return { ...this.context };
  }

  public getHistory(): TransitionEvent[] {
    return [...this.history];
  }

  public onTransition(listener: TransitionListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Deterministically transitions to a new state if valid.
   * Throws Error if the transition violates the state machine rules.
   */
  public transition(nextState: WorkflowState, reason?: string, meta?: Record<string, any>): void {
    const fromState = this.currentState;

    if (fromState === nextState) {
      return; // No-op for identical state
    }

    const allowed = VALID_TRANSITIONS[fromState];
    if (!allowed || !allowed.has(nextState)) {
      throw new Error(
        `Invalid state transition: Cannot transition from '${fromState}' to '${nextState}'. Valid transitions are: [${Array.from(
          allowed || []
        ).join(", ")}]`
      );
    }

    this.currentState = nextState;
    const event: TransitionEvent = {
      from: fromState,
      to: nextState,
      timestamp: new Date().toISOString(),
      reason,
      meta,
    };

    this.history.push(event);

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Error in state machine listener:", err);
      }
    }
  }

  /**
   * Checks if user intervention is required (e.g. login, review, OTP).
   */
  public requiresUserInteraction(): boolean {
    return [
      "AUTH_REQUIRED",
      "WAITING_FOR_USER_LOGIN",
      "REAUTHENTICATION_REQUIRED",
      "AWAITING_USER_REVIEW",
      "PAUSED",
    ].includes(this.currentState);
  }

  /**
   * Checks if the workflow is in a terminal state.
   */
  public isTerminal(): boolean {
    return ["COMPLETED", "FAILED", "CANCELLED"].includes(this.currentState);
  }

  /**
   * Creates a serializable checkpoint snapshot.
   */
  public createCheckpoint(params: {
    currentUrl?: string;
    portalId?: string;
    step?: string;
    filledFields?: string[];
    missingFields?: string[];
    formData?: Record<string, any>;
    customAnswers?: Record<string, string>;
  }): WorkflowCheckpoint {
    this.currentCheckpoint = {
      state: this.currentState,
      step: params.step || this.currentState.toLowerCase(),
      portalId: params.portalId || this.context.portalId || "generic",
      currentUrl: params.currentUrl || this.context.jobUrl,
      data: {
        filledFields: params.filledFields || [],
        missingFields: params.missingFields || [],
        formData: params.formData || {},
        customAnswers: params.customAnswers || {},
      },
      timestamp: new Date().toISOString(),
    };
    return this.currentCheckpoint;
  }

  public getCheckpoint(): WorkflowCheckpoint | null {
    return this.currentCheckpoint;
  }

  /**
   * Restores a state machine from a previously saved checkpoint.
   */
  public static fromCheckpoint(
    context: StateMachineContext,
    checkpoint: WorkflowCheckpoint
  ): AuthStateMachine {
    const sm = new AuthStateMachine(
      {
        ...context,
        portalId: checkpoint.portalId || context.portalId,
        jobUrl: checkpoint.currentUrl || context.jobUrl,
      },
      checkpoint.state
    );
    sm.currentCheckpoint = checkpoint;
    return sm;
  }
}
