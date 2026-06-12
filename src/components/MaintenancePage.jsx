import { motion } from "framer-motion";

export default function MaintenancePage({

    title = "Mantenimiento",
    subtitle = "Página no disponible temporalmente",
    message = "Estamos trabajando en esta sección para habilitarla pronto."

}) {

    return (

        <>
            <div className="maintenance-wrapper">

                <motion.div
                    className="maintenance-card"
                    initial={{
                        opacity: 0,
                        y: 40,
                        scale: 0.95
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1
                    }}
                    transition={{
                        duration: 0.6
                    }}
                >

                    <div className="loader-container">

                        <div className="loader-ring ring-1"></div>
                        <div className="loader-ring ring-2"></div>
                        <div className="loader-ring ring-3"></div>

                        <div className="loader-core"></div>

                    </div>

                    <h1>{title}</h1>

                    <h2>{subtitle}</h2>

                    <p>{message}</p>

                </motion.div>

            </div>

            <style>{`

                *{
                    box-sizing:border-box;
                }

                .maintenance-wrapper{

                    width:100%;
                    min-height:100vh;

                    display:flex;
                    align-items:center;
                    justify-content:center;

                    padding:40px;

                    background:
                    linear-gradient(
                        180deg,
                        #f8fbff 0%,
                        #eef4ff 100%
                    );

                    overflow:hidden;
                }

                .maintenance-card{

                    position:relative;

                    width:100%;
                    max-width:760px;

                    padding:70px 50px;

                    border-radius:36px;

                    text-align:center;

                    background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.95),
                        rgba(248,250,252,.92)
                    );

                    border:
                    1px solid rgba(255,255,255,.7);

                    backdrop-filter: blur(18px);

                    box-shadow:
                    0 20px 60px rgba(15,23,42,.08),
                    inset 0 1px 0 rgba(255,255,255,.7);
                }

                .loader-container{

                    position:relative;

                    width:180px;
                    height:180px;

                    margin:auto;
                    margin-bottom:45px;
                }

                .loader-ring{

                    position:absolute;

                    border-radius:50%;

                    border-style:solid;

                    animation:
                    spin 2.8s linear infinite;
                }

                .ring-1{

                    width:180px;
                    height:180px;

                    border-width:8px;

                    border-color:
                    #2563eb transparent transparent transparent;
                }

                .ring-2{

                    width:130px;
                    height:130px;

                    top:25px;
                    left:25px;

                    border-width:7px;

                    border-color:
                    transparent #60a5fa transparent transparent;

                    animation-direction:reverse;

                    animation-duration:2.2s;
                }

                .ring-3{

                    width:80px;
                    height:80px;

                    top:50px;
                    left:50px;

                    border-width:6px;

                    border-color:
                    transparent transparent #93c5fd transparent;

                    animation-duration:1.6s;
                }

                .loader-core{

                    position:absolute;

                    width:28px;
                    height:28px;

                    border-radius:50%;

                    background:#2563eb;

                    top:50%;
                    left:50%;

                    transform:
                    translate(-50%,-50%);

                    box-shadow:
                    0 0 30px rgba(37,99,235,.45);
                }

                .maintenance-card h1{

                    margin:0;

                    font-size:64px;

                    font-weight:800;

                    letter-spacing:-2px;

                    color:#0f172a;
                }

                .maintenance-card h2{

                    margin-top:14px;
                    margin-bottom:24px;

                    font-size:28px;

                    font-weight:600;

                    color:#2563eb;
                }

                .maintenance-card p{

                    margin:0 auto;

                    max-width:520px;

                    line-height:1.8;

                    font-size:18px;

                    color:#64748b;
                }

                @keyframes spin{

                    from{
                        transform:rotate(0deg);
                    }

                    to{
                        transform:rotate(360deg);
                    }
                }

                @media(max-width:768px){

                    .maintenance-card{

                        padding:50px 30px;
                    }

                    .maintenance-card h1{

                        font-size:42px;
                    }

                    .maintenance-card h2{

                        font-size:22px;
                    }

                    .maintenance-card p{

                        font-size:16px;
                    }

                    .loader-container{

                        transform:scale(.8);
                    }
                }

            `}</style>
        </>
    );
}