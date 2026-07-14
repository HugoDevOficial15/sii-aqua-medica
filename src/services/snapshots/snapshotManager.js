/*
|--------------------------------------------------------------------------
| Snapshot Manager
|--------------------------------------------------------------------------
|
| Centraliza todos los listeners del sistema.
| Evita fugas de memoria.
| Permite cerrar todos los snapshots cuando sea necesario.
|
*/

class SnapshotManager {

    constructor() {

        this.listeners = new Map();

    }

    subscribe(key, unsubscribe) {

        this.unsubscribe(key);

        this.listeners.set(
            key,
            unsubscribe
        );

    }

    unsubscribe(key) {

        if (!this.listeners.has(key))
            return;

        this.listeners
            .get(key)();

        this.listeners.delete(key);

    }

    unsubscribeAll() {

        this.listeners.forEach(fn => fn());

        this.listeners.clear();

    }

}

export default new SnapshotManager();