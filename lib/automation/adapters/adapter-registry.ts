import { PortalAdapter } from "./portal-adapter.interface";
import { GenericPortalAdapter } from "./generic-adapter";
import { InternshalaAdapter } from "./internshala-adapter";
import { AshbyAdapter } from "./ashby-adapter";
import { GreenhouseAdapter } from "./greenhouse-adapter";
import { LeverAdapter } from "./lever-adapter";

export class AdapterRegistry {
  private adapters: PortalAdapter[] = [];
  private fallbackAdapter: PortalAdapter;

  constructor() {
    this.fallbackAdapter = new GenericPortalAdapter();

    // Register specialized adapters in priority order
    this.registerAdapter(new InternshalaAdapter());
    this.registerAdapter(new AshbyAdapter());
    this.registerAdapter(new GreenhouseAdapter());
    this.registerAdapter(new LeverAdapter());
  }

  public registerAdapter(adapter: PortalAdapter): void {
    // Avoid duplicate registration of the same adapter id
    this.adapters = this.adapters.filter((a) => a.id !== adapter.id);
    this.adapters.push(adapter);
  }

  public getAdapterForUrl(
    jobUrl: string,
    pageContext?: { html?: string; url?: string }
  ): PortalAdapter {
    for (const adapter of this.adapters) {
      try {
        if (adapter.canHandle(jobUrl, pageContext)) {
          return adapter;
        }
      } catch (err) {
        console.warn(`Adapter ${adapter.id} canHandle error:`, err);
      }
    }
    return this.fallbackAdapter;
  }

  public getAdapterById(id: string): PortalAdapter {
    const found = this.adapters.find((a) => a.id.toLowerCase() === id.toLowerCase());
    return found || this.fallbackAdapter;
  }

  public getAllAdapters(): PortalAdapter[] {
    return [...this.adapters, this.fallbackAdapter];
  }
}

export const adapterRegistry = new AdapterRegistry();
