'use strict';

/*
 * Created with @iobroker/create-adapter v1.34.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");

class GoogleAssistant extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            systemConfig: true, // aus Doku -> kann später wieder raus
            useFormatDate: true, // aus Doku -> kann später wieder raus
            name: 'google-assistant',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        await this.setObjectNotExistsAsync('testVariable', {
            type: 'state',
            common: {
                name: 'testVariable',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: true,
            },
            native: {},
        });

        // this variable indicates in the GUI the connection to the service/device
        await this.createStateAsync('', 'info', 'connection', 'indicator'); // device, channel, state, role
        await this.setStateAsync('info.connection', { val: true, ack: true });

        this.subscribeToStatesInIobroker();

        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        await this.setStateAsync('testVariable', {
            val: true,
            ack: true,
            expire: 30,
        });

        await this.setForeignStateAsync('0_userdata.0.example_state', 200);

        // examples for the checkPassword/checkGroup functions
        await this.showConfigurationsAndAttributes();

        this.log.info(
            'State ausgelesen: ' +
                JSON.stringify(await this.getStateAsync('testVariable'))
        );

        this.log.info(
            'State von anderen Adapter: ' +
                JSON.stringify(
                    await this.getForeignStateAsync('admin.0.info.connection')
                )
        );

        this.log.info(
            'Description of adapter admin: ' +
                JSON.stringify(
                    await this.getForeignObjectAsync('system.adapter.admin')
                )
        );

        await this.showRooms();
    }

    async showRooms() {
        this.log.info(
            '\n\nEnums: ' + JSON.stringify(await this.getEnumAsync(''))
        );
        /*
         * { "enum.rooms.hall": { ..., members: [<states>], ...},
         *   "enum.rooms.bathroom": { ..., members: [<states>], ...},
         *   "enum.rooms.living_room": { ..., members: [<states>], ...},
         * }
         */
        const roomsEnum = (await this.getEnumAsync('enum.rooms')).result;
        console.log(roomsEnum);

        /*
         * Map< 'room', { metaInfoGoogle: { ... }, deviceMap: Map< 'objectId', { metaInfo: {}, metaInfoGoogle: {}, currentState: {...} } > }}
         * for example:
         * Map< 'enum.rooms.hall', { googleMetaInfo: { ... }, deviceMap: Map< '0_userdata.0.example_state', { ... } > }}
         */
        const roomMap = new Map();
        for (const room of Object.keys(roomsEnum)) {
            this.log.debug(room);
            // this.log.debug(roomsEnum[room].common.members);

            const deviceMapForRoom = await this.getDeviceInfos(
                roomsEnum[room].common.members
            );

            this.log.debug(
                'deviceMap: ' + JSON.stringify(Array.from(deviceMapForRoom))
            );
            roomMap.set(room, {
                googleMetaInfo: {},
                deviceMap: deviceMapForRoom,
            });
        }
        this.log.debug('roomMap: ' + JSON.stringify(Array.from(roomMap)));
    }

    async getDeviceInfos(deviceIds) {
        const _deviceMapForRoom = new Map();
        for (const objectId of deviceIds) {
            const tmpMetaInfo =
                (await this.getForeignObjectAsync(objectId)) || {};
            const tmpCurrentState =
                (await this.getForeignStateAsync(objectId)) || {};
            this.log.debug(
                'Device found in room "' + objectId + '" '
                // + JSON.stringify(
                //     tmpMetaInfo
                // )
            );

            // test if 'state' and not other object type
            if (tmpMetaInfo.type !== 'state') {
                this.log.debug(
                    'The device "' +
                        objectId +
                        '" is not a state and will not be added to the device list: ' +
                        JSON.stringify(tmpMetaInfo)
                );
                continue;
            }

            //TODO: test if the states 'role' has a matching Google type

            _deviceMapForRoom.set(objectId, {
                metaInfo: tmpMetaInfo,
                metaInfoGoogle: {},
                currentState: tmpCurrentState,
            });
        }
        return _deviceMapForRoom;
    }

    subscribeToStatesInIobroker() {
        /*
        of own adapter instance
        */

        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
        this.subscribeStates('testVariable');
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');

        /*
        of other adapters
        */

        this.subscribeForeignStates('*.example_state');
    }

    async showConfigurationsAndAttributes() {
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw iobroker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);

        // io-package.json -> common
        this.log.debug('\nCommon ' + JSON.stringify(this.common));
        // io-package.json -> native
        // The adapters config(in the instance object everything under the attribute "native") is accessible via this.config:
        // every new config value must be added in io-package.json -> native first
        // then it can be modified with the GUI (./admin/index_m.html)
        this.log.debug('config option1: ' + this.config.option1);
        this.log.debug('config option2: ' + this.config.option2);

        // Complete io-package.json and package.json
        // this.log.info('\nioPack ' + JSON.stringify(this.ioPack));
        // this.log.info('\npack ' + JSON.stringify(this.pack));
        // ioBroker configuration (stored in file iobroker-data/iobroker.json)
        // needed to be activated in adapter constructor
        this.log.debug('systemcConfig: ' + JSON.stringify(this.systemConfig));

        this.log.info(
            `Variablen: 
            name: ${this.name}, 
            host: ${this.host}, 
            instance: ${this.instance}, 
            namespace: ${this.namespace}, 
            config: ${JSON.stringify(this.config)},
            systemConfig (must be activated): ${this.systemConfig},
            adapterDir: ${this.adapterDir},
            version: ${this.version},
            connected: ${this.connected}
            dateFormat: ${this.dateFormat}`
        );
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        console.log('In funktion "onUnload()"');
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(
                `state ${id} changed: ${state.val} (ack = ${state.ack})`
            );
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new GoogleAssistant(options);
} else {
    // otherwise start the instance directly
    new GoogleAssistant();
}
