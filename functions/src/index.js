const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({
    region: "us-central1",
    maxInstances: 10,
});

// exports.testConnection =
//     require("./test").testConnection;

exports.lockRack =
    require("./features/locks").lockRack;