/**
 *
 * @param {*} things - things array, call by reference! (to not need to override the whole array)
 * @param {*} deviceId
 * @param {*} functionId
 * @returns the changed device or undefined if the device is not in the things array
 */
function addDeviceTypeToThing(things, deviceId, functionId) {
    //find device in things array
    return things.find((device) => {
        if (device.deviceId == deviceId) {
            //find correct google type
            const googleType = getGoogleTypeFromFunctionId(functionId);
            //add google type if not already in there
            if (googleType && !device.deviceTypes.includes(googleType)) {
                device.deviceTypes.push(googleType);
            }
            return true;
        }
    });
}

function getGoogleTypeFromFunctionId(functionId) {
    let googleType;
    switch (functionId) {
        case 'enum.functions.light':
            googleType = 'action.devices.types.LIGHT';
            break;
        case 'enum.functions.lighting':
            googleType = 'action.devices.types.LIGHT';
            break;
        case 'enum.functions.heating':
            googleType = 'action.devices.types.HEATER';
            break;
        // case '':
        //     googleType = 'action.devices.types.SWITCH';
        //     break;
        case 'enum.functions.socket':
            googleType = 'action.devices.types.OUTLET';
            break;
        case 'enum.functions.door':
            googleType = 'action.devices.types.DOOR';
            break;
        case 'enum.functions.lock':
            googleType = 'action.devices.types.LOCK';
            break;
        case 'enum.functions.alarm_system':
            googleType = 'action.devices.types.SECURITYSYSTEM';
            break;
        case 'enum.functions.security':
            googleType = 'action.devices.types.SECURITYSYSTEM';
            break;
        case 'enum.functions.temperature_sensor':
            googleType = 'action.devices.types.SENSOR';
            break;
        default:
            break;
    }
    return googleType;
}

function addLocationToThing(things, deviceId, roomName) {
    //find device in things array
    return things.find((device) => {
        if (device.deviceId == deviceId) {
            //TODO: if device is in two rooms, it will be overridden -> array
            //TODO: translation to other languages
            device.location = roomName;
        }
    });
}

module.exports = {
    addDeviceTypeToThing,
    addLocationToThing,
};
