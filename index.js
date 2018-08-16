'use strict';

import { 
  NativeModules, 
  DeviceEventEmitter, 
  NativeEventEmitter,
  Platform 
} from 'react-native';

export const NfcDataType = {
    NDEF : "NDEF",
    TAG : "TAG"
};

export const NdefRecordType = {
    TEXT : "TEXT",
    URI : "URI",
    MIME : "MIME"
};

const { ReactNativeNFC } = NativeModules;
const eventEmitter = new NativeEventEmitter(ReactNativeNFC);
const NFC_DISCOVERED = '__NFC_DISCOVERED';
const NFC_ERROR = '__NFC_ERROR';
const NFC_MISSING = '__NFC_MISSING';
const NFC_UNAVAILABLE = '__NFC_UNAVAILABLE';
const NFC_ENABLED = '__NFC_ENABLED';
// const startUpNfcData = ReactNativeNFC.getStartUpNfcData || (() => ({}));

let _enabled = true;
let _registeredToEvents = false;
let _listeners = {};
let _errListeners = {};
let _loading = true;
let _status = "waiting";

if (Platform.OS == "ios") {
    eventEmitter.addListener(NFC_MISSING, () => {_enabled = false; _loading = false; _status = "missing";});
    eventEmitter.addListener(NFC_UNAVAILABLE, () => {_enabled = false; _loading = false; _status = "unavailable";});
    eventEmitter.addListener(NFC_ENABLED, () => {_enabled = true; _loading = false; _status = "ready";});
} else {
    DeviceEventEmitter.addListener(NFC_MISSING, (res) => {
        _enabled = false;
        _loading = false;
        _status = "missing";
    });
    DeviceEventEmitter.addListener(NFC_UNAVAILABLE, (res) => {
        _enabled = false;
        _loading = false;
        _status = "unavailable";
    });
    DeviceEventEmitter.addListener(NFC_ENABLED, (res) => {
        _enabled = true;
        _loading = false;
        _status = "ready";
    });
}

ReactNativeNFC.isSupported();

let _registerToEvents = () => {
    if (Platform.OS == "ios") {
        try{
            eventEmitter.removeAllListeners(NFC_DISCOVERED);
            eventEmitter.removeAllListeners(NFC_ERROR);
            eventEmitter.addListener(NFC_DISCOVERED, _notifyListeners);
            eventEmitter.addListener(NFC_ERROR, _notifyErrListeners);
        }catch(iosErr){
            console.log("iosErr", iosErr);
        }
    }
    else{
        try{
            // startUpNfcData(_notifyListeners);
            DeviceEventEmitter.removeAllListeners(NFC_DISCOVERED);
            DeviceEventEmitter.removeAllListeners(NFC_ERROR);
            DeviceEventEmitter.addListener(NFC_DISCOVERED, _notifyListeners);
            DeviceEventEmitter.addListener(NFC_ERROR, _notifyErrListeners);

        }catch(androidErr){
            console.log("androidErr", androidErr);
        }
    }
};

let _notifyListeners = (data) => {
    let payload = {
        from_device: data
    };
    
    if (Platform.OS == "ios") {
        if(data[0]){
            let dat = data[0];
            payload.id = dat.tid;
            payload.type = dat.type;
            payload.origin = dat.origin;
            if(dat.encoding){
                payload.encoding = dat.encoding;
            }
            payload.scanned = dat.payload;
        }
    }
    else{
        payload.origin = data.origin;
        payload.id = data.id;
        payload.type = data.type;
        if(data.data[0] && data.data[0][0]){
            let dat = data.data[0][0];
            payload.encoding = dat.encoding;
            payload.scanned = dat.data;
        }
    }

    if(data){
        for(let _listener in _listeners){
            _listeners[_listener](payload);
        }
    }
};

let _notifyErrListeners = (data) => {
    if(data){
        for(let _listener in _errListeners){
            _errListeners[_listener](data);
        }
    }
};

const NFC = {};

NFC.initialize = () => {
    const init = ReactNativeNFC.initialize || (() => ({}));
    if(_enabled && !_loading){
        init();
    }else {
        throw new Error("NFC Controller object is not ready");
    }
};

NFC.isEnabled = () => {
    return _enabled && !_loading;
}

NFC.checkDeviceStatus = () => {
    return _status;
}

NFC.addListener = (name, callback, error) => {
    if(callback){
        _listeners[name] = callback; 
    }
    if(error){
        _errListeners[name] = error;
    }
    _registerToEvents();
};

NFC.removeListener = (name) => {
    delete _listeners[name];
    delete _errListeners[name];
};

NFC.removeAllListeners = () => {
    if (Platform.OS == "ios") {
        try{
            eventEmitter.removeAllListeners(NFC_DISCOVERED);
            eventEmitter.removeAllListeners(NFC_ERROR);
        }catch(iosErr){
            console.log("iosErr", iosErr);
        }
    }
    else{
        try{
            DeviceEventEmitter.removeAllListeners(NFC_DISCOVERED);
            DeviceEventEmitter.removeAllListeners(NFC_ERROR);
        }catch(androidErr){
            console.log("androidErr", androidErr);
        }
    }
    _listeners = {};
    _errListeners = {};
    _registeredToEvents = false;
};

export default NFC;