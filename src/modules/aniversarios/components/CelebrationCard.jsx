import { FaBirthdayCake, FaAward } from "react-icons/fa";

export default function CelebrationCard({ user, type }) {

    const isAniversario = type === "aniversario";

    return (

        <>
            <div className={`celebration-card ${user.esMultiple5 ? "highlight" : ""}`}>

                <div className="card-glow"></div>

                <div className="left">

                    <div className="avatar">
                        {user.nombre.charAt(0)}
                    </div>

                    <div className="user-info">
                        <h6 className="name">
                            {user.nombre}
                        </h6>

                        <span className="nomina">
                            NÓMINA #{user.nomina}
                        </span>
                    </div>

                </div>

                <div className="right">

                    <div className={`icon-box ${isAniversario ? "gold" : "pink"}`}>
                        {isAniversario ? <FaAward /> : <FaBirthdayCake />}
                    </div>

                    <div className="info">

                        {isAniversario ? (
                            <>
                                <span className="main">
                                    {user.anios} AÑOS
                                </span>

                                <span className="sub">
                                    {user.fechaCompleta}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="main">
                                    {user.fechaCompleta}
                                </span>

                                <span className="sub">
                                    Cumpleaños
                                </span>
                            </>
                        )}

                    </div>

                </div>

            </div>

            <style jsx>{`

                .celebration-card {
                    position: relative;

                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    padding: 20px;
                    margin-bottom: 18px;

                    border-radius: 24px;

                    background: rgba(255,255,255,0.75);

                    backdrop-filter: blur(14px);

                    border: 1px solid rgba(255,255,255,0.5);

                    overflow: hidden;

                    transition: all .35s ease;
                }

                .celebration-card:hover {
                    transform: translateY(-6px);

                    box-shadow:
                        0 10px 30px rgba(0,0,0,0.08),
                        0 2px 10px rgba(0,0,0,0.05);
                }

                .card-glow {
                    position: absolute;

                    width: 180px;
                    height: 180px;

                    background: radial-gradient(
                        circle,
                        rgba(99,102,241,.12),
                        transparent 70%
                    );

                    top: -60px;
                    right: -60px;
                }

                .left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    z-index: 2;
                }

                .avatar {
                    width: 56px;
                    height: 56px;

                    border-radius: 18px;

                    background: linear-gradient(
                        135deg,
                        #4f46e5,
                        #7c3aed
                    );

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    color: white;

                    font-size: 22px;
                    font-weight: 700;

                    box-shadow:
                        0 6px 18px rgba(79,70,229,.35);
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                }

                .name {
                    margin: 0;
                    font-weight: 700;
                    font-size: 15px;
                    text-transform: uppercase;
                    letter-spacing: .5px;
                    color: #111827;
                }

                .nomina {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 3px;
                }

                .right {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    z-index: 2;
                }

                .icon-box {
                    width: 46px;
                    height: 46px;

                    border-radius: 16px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    font-size: 18px;
                    color: white;
                }

                .gold {
                    background: linear-gradient(
                        135deg,
                        #f59e0b,
                        #fbbf24
                    );
                }

                .pink {
                    background: linear-gradient(
                        135deg,
                        #ec4899,
                        #f472b6
                    );
                }

                .info {
                    display: flex;
                    flex-direction: column;
                    text-align: right;
                }

                .main {
                    font-size: 15px;
                    font-weight: 700;
                    color: #111827;
                }

                .sub {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 2px;
                }

                .highlight {
                    background:
                        linear-gradient(
                            135deg,
                            rgba(255,248,220,.95),
                            rgba(255,255,255,.95)
                        );

                    border: 1px solid rgba(251,191,36,.4);

                    box-shadow:
                        0 0 0 1px rgba(251,191,36,.08),
                        0 10px 25px rgba(251,191,36,.12);
                }

                @media(max-width: 768px){

                    .celebration-card{
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 18px;
                    }

                    .right{
                        width: 100%;
                        justify-content: space-between;
                    }

                    .info{
                        text-align: left;
                    }

                }

            `}</style>
        </>
    );
}