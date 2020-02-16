import utils from '../services/utils.js';
import Mutex from "../services/mutex.js";
import appContext from "../services/app_context.js";

export default class Component {
    /**
     * @param {Component} parent
     */
    constructor(parent) {
        this.componentId = `comp-${this.constructor.name}-` + utils.randomString(6);
        /** @type Component */
        this.parent = parent;
        /** @type Component[] */
        this.children = [];
        this.initialized = Promise.resolve();
        this.mutex = new Mutex();
    }

    async eventReceived(name, data) {
        await this.initialized;

        const fun = this[name + 'Listener'];

        const start = Date.now();

        await this.callMethod(fun, data);

        const end = Date.now();

        if (end - start > 10 && glob.PROFILING_LOG) {
            console.log(`Event ${name} in component ${this.componentId} took ${end-start}ms`);
        }

        await this.triggerChildren(name, data);
    }

    async trigger(name, data) {
        await appContext.trigger(name, data);
    }

    async triggerChildren(name, data) {
        const promises = [];

        for (const child of this.children) {
            promises.push(child.eventReceived(name, data));
        }

        await Promise.all(promises);
    }

    async triggerCommand(name, data = {}) {
        const fun = this[name + 'Command'];

        const called = await this.callMethod(fun, data);

        if (!called) {
            await this.parent.triggerCommand(name, data);
        }
    }

    async callMethod(fun, data) {
        if (typeof fun !== 'function') {
            return false;
        }

        let release;

        try {
            release = await this.mutex.acquire();

            await fun.call(this, data);

            return true;
        } finally {
            if (release) {
                release();
            }
        }
    }
}