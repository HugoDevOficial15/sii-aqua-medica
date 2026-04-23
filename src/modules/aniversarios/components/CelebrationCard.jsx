import { FaBirthdayCake, FaAward } from "react-icons/fa";

export default function CelebrationCard({ user, type }) {

    const isAniversario = type === "aniversario";

    return (
        <div className={`celebration-card ${user.esMultiple5 ? "highlight" : ""}`}>

            <div className="left">
                <div className="avatar">
                    {user.nombre.charAt(0)}
                </div>

                <div>
                    <h6 className="mb-0 fw-bold name">
                        {user.nombre.toUpperCase()}
                    </h6>
                    <small className="text-muted">
                        NÓMINA: {user.nomina}
                    </small>
                </div>
            </div>

            <div className="right">
                <div className="icon">
                    {isAniversario ? <FaAward /> : <FaBirthdayCake />}
                </div>

                <div className="info">
                    {isAniversario ? (
                        <>
                            <span className="main">
                                {user.anios} AÑOS
                            </span>
                            <span className="sub">
                                {user.fechaCompleta.toUpperCase()}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="main">
                                {user.fechaCompleta.toUpperCase()}
                            </span>
                            <span className="sub">
                                CUMPLEAÑOS
                            </span>
                        </>
                    )}
                </div>

            </div>

            <style jsx>{`
                .celebration-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 18px;
                    border-radius: 16px;
                    margin-bottom: 12px;

                    background: #ffffff;
                    border: 1px solid #e5e7eb;

                    transition: all 0.25s ease;
                }

                .celebration-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.08);
                }

                .left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #0ea5e9, #2563eb);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                }

                .name {
                    letter-spacing: 0.5px;
                }

                .right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .icon {
                    font-size: 18px;
                    color: #6b7280;
                }

                .info {
                    display: flex;
                    flex-direction: column;
                    text-align: right;
                }

                .main {
                    font-weight: 700;
                    font-size: 14px;
                }

                .sub {
                    font-size: 12px;
                    color: #9ca3af;
                }

                /* 🌟 PREMIUM */
                .highlight {
                    background: linear-gradient(135deg, #fff7cc, #ffffff);
                    border: 1px solid #facc15;
                    box-shadow: 0 0 0 1px rgba(250,204,21,0.2);
                }

                .highlight .avatar {
                    background: linear-gradient(135deg, #f59e0b, #fbbf24);
                }
            `}</style>

        </div>
    );
}