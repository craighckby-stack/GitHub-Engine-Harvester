/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine 1: Spatiotemporal Lifecycle & Plugin Kernel
 * Clean-room implementation of Cordis-inspired composability for agent harnesses.
 * Features hierarchical context scopes, service injection, and spatiotemporal event hooks.
 */

import {
  Disposable,
  HookHandler,
  LifecycleHookName,
  Plugin,
  PluginManifest,
  SpatiotemporalContext,
} from './types';

export class SpatiotemporalLifecycleContext implements SpatiotemporalContext {
  public readonly id: string;
  public readonly parent: SpatiotemporalContext | null;
  public readonly scope: 'global' | 'session' | 'step';

  private services: Map<string, unknown> = new Map();
  private hooks: Map<LifecycleHookName, Set<HookHandler<any>>> = new Map();
  private activePlugins: Map<string, Plugin<any>> = new Map();
  private disposables: Set<Disposable> = new Set();
  private isDisposed = false;

  constructor(
    scope: 'global' | 'session' | 'step' = 'global',
    parent: SpatiotemporalContext | null = null,
    customId?: string
  ) {
    this.id = customId || `${scope}_${Math.random().toString(36).substring(2, 9)}`;
    this.scope = scope;
    this.parent = parent;
  }

  /**
   * Register a dependency/service into this context scope.
   */
  public provide<T>(id: string, service: T): void {
    if (this.isDisposed) throw new Error(`Cannot provide service to disposed context ${this.id}`);
    this.services.set(id, service);
  }

  /**
   * Resolve a service by traversing up the context prototype hierarchy.
   */
  public inject<T>(id: string): T {
    if (this.services.has(id)) {
      return this.services.get(id) as T;
    }
    if (this.parent) {
      return this.parent.inject<T>(id);
    }
    throw new Error(`Service '${id}' not found in Spatiotemporal Context hierarchy [${this.id}]`);
  }

  /**
   * Check if a service is provided either in this context or any ancestor.
   */
  public has(id: string): boolean {
    if (this.services.has(id)) return true;
    return this.parent ? this.parent.has(id) : false;
  }

  /**
   * Subscribe to a spatiotemporal lifecycle event.
   */
  public on<T = unknown>(event: LifecycleHookName, handler: HookHandler<T>): Disposable {
    if (this.isDisposed) {
      return { dispose: () => {} };
    }

    if (!this.hooks.has(event)) {
      this.hooks.set(event, new Set());
    }

    const set = this.hooks.get(event)!;
    set.add(handler);

    const disposable: Disposable = {
      dispose: () => {
        set.delete(handler);
        this.disposables.delete(disposable);
      },
    };
    this.disposables.add(disposable);
    return disposable;
  }

  /**
   * Emit an event through the current context and propagate upward through the hierarchy.
   */
  public async emit<T = unknown>(event: LifecycleHookName, payload: T): Promise<void> {
    if (this.isDisposed) return;

    // Fire local handlers
    const handlers = this.hooks.get(event);
    if (handlers && handlers.size > 0) {
      const promises: Promise<void>[] = [];
      for (const handler of Array.from(handlers)) {
        try {
          const res = handler(payload, this);
          if (res instanceof Promise) {
            promises.push(res);
          }
        } catch (err) {
          console.error(`[LifecycleContext ${this.id}] Error in hook '${event}':`, err);
        }
      }
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    // Propagate up to parent context
    if (this.parent) {
      await this.parent.emit(event, payload);
    }
  }

  /**
   * Dynamically mount a plugin with its configuration and track its lifecycle.
   */
  public plugin<TConfig>(plugin: Plugin<TConfig>, config?: TConfig): Disposable {
    if (this.isDisposed) throw new Error(`Cannot register plugin in disposed context ${this.id}`);

    if (this.activePlugins.has(plugin.name)) {
      console.warn(`[LifecycleContext] Plugin '${plugin.name}' already registered in context ${this.id}`);
    }

    this.activePlugins.set(plugin.name, plugin as Plugin<any>);

    try {
      const maybePromise = plugin.apply(this, config);
      if (maybePromise instanceof Promise) {
        maybePromise.catch((err) => {
          console.error(`[LifecycleContext] Plugin ${plugin.name} failed during async application:`, err);
        });
      }
    } catch (err) {
      console.error(`[LifecycleContext] Plugin ${plugin.name} failed to apply:`, err);
    }

    const disposable: Disposable = {
      dispose: () => {
        this.activePlugins.delete(plugin.name);
        this.disposables.delete(disposable);
      },
    };

    this.disposables.add(disposable);
    return disposable;
  }

  /**
   * Branch into a scoped child context with lexical inheritance.
   */
  public extend(scope: 'session' | 'step'): SpatiotemporalContext {
    return new SpatiotemporalLifecycleContext(scope, this);
  }

  /**
   * Teardown this context and all registered subscriptions.
   */
  public async dispose(): Promise<void> {
    if (this.isDisposed) return;
    this.isDisposed = true;

    for (const d of Array.from(this.disposables)) {
      try {
        await d.dispose();
      } catch (err) {
        console.error(`[LifecycleContext ${this.id}] Error during disposal:`, err);
      }
    }

    this.disposables.clear();
    this.hooks.clear();
    this.services.clear();
    this.activePlugins.clear();
  }

  public getActivePluginNames(): string[] {
    return Array.from(this.activePlugins.keys());
  }
}

/**
 * Creates the root spatiotemporal kernel context.
 */
export function createLifecycleKernel(): SpatiotemporalContext {
  return new SpatiotemporalLifecycleContext('global', null, 'kernel_root');
}
