const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db } = require("../../config/firebase");

const LOCK_TIME = 5 * 60 * 1000;

exports.lockRack = onCall(async (request) => {

    const { action, rackId, user } = request.data;

    if (!rackId) {

        throw new HttpsError(
            "invalid-argument",
            "Rack inválido."
        );

    }

    const ref =
        db.collection("locks").doc(rackId);

    if (action === "unlock") {

        await ref.delete();

        return {
            ok: true
        };

    }

    try {

        await db.runTransaction(async (tx) => {

            const snap =
                await tx.get(ref);

            if (snap.exists) {

                const data =
                    snap.data();

                const expires =
                    data.expiresAt.toMillis();

                if (expires > Date.now()) {

                    throw new Error(
                        "LOCK_EXISTS"
                    );

                }

            }

            tx.set(ref, {

                rackId,

                userId: user.id,

                userName: user.nombre,

                createdAt: new Date(),

                expiresAt: new Date(
                    Date.now() + LOCK_TIME
                )

            });

        });

        return {

            ok: true

        };

    } catch (e) {

        if (
            e.message === "LOCK_EXISTS"
        ) {

            return {

                ok: false,

                message:
                    "Otro usuario ya está utilizando este rack."

            };

        }

        console.error(e);

        throw new HttpsError(

            "internal",

            "Error interno."

        );

    }

});