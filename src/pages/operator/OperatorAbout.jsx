import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";

import MobileBackButton from "./components/MobileBackButton";
import capacitorConfig from "../../../capacitor.config.json";
import packageJson from "../../../package.json";

function getWebViewVersion() {
    const match = navigator.userAgent.match(/Chrome\/([\d.]+)/);
    return match ? match[1] : navigator.userAgent;
}

export default function OperatorAbout({ onBack }) {

    const [appInfo, setAppInfo] = useState({
        name: capacitorConfig.appName,
        id: capacitorConfig.appId,
        version: packageJson.version,
        build: "-"
    });

    const [deviceInfo, setDeviceInfo] = useState(null);

    useEffect(() => {
        App.getInfo()
            .then(setAppInfo)
            .catch(() => {
                // Web/dev: App.getInfo() no está disponible fuera del APK nativo.
            });

        Device.getInfo()
            .then(setDeviceInfo)
            .catch(() => {});
    }, []);

    return (
        <div className="support-screen">

            <MobileBackButton onBack={onBack} />

            <div className="support-hero">
                <h1>Acerca de</h1>
                <p>Información de la aplicación.</p>
            </div>

            <div className="about-card">
                <div className="about-row">
                    <span>Nombre de la aplicación</span>
                    <span>{appInfo.name}</span>
                </div>
                <div className="about-row">
                    <span>Versión</span>
                    <span>{appInfo.version}</span>
                </div>
                <div className="about-row">
                    <span>Build</span>
                    <span>{appInfo.build}</span>
                </div>
                <div className="about-row">
                    <span>Fecha de compilación</span>
                    <span>
                        {new Date(__BUILD_DATE__).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        })}
                    </span>
                </div>
            </div>

            <div className="about-card">
                <div className="about-row">
                    <span>Versión mínima de Android</span>
                    <span>
                        {__MIN_SDK_VERSION__
                            ? `API ${__MIN_SDK_VERSION__}`
                            : "N/D"}
                    </span>
                </div>
                <div className="about-row">
                    <span>Versión del WebView</span>
                    <span>{getWebViewVersion()}</span>
                </div>
                {deviceInfo && (
                    <div className="about-row">
                        <span>Este dispositivo</span>
                        <span>
                            {deviceInfo.operatingSystem} {deviceInfo.osVersion}
                        </span>
                    </div>
                )}
            </div>

            <div className="about-card">
                <div className="about-row">
                    <span>Desarrollado por</span>
                    <span>Equipo de Sistemas AQUA Médica</span>
                </div>
                <div className="about-row">
                    <span>Licencias</span>
                    <span>React, React Router, Capacitor</span>
                </div>
            </div>

        </div>
    );
}
