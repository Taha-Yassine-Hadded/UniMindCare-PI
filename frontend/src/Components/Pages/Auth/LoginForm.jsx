import { useState } from 'react';
import { Facebook, Instagram, Linkedin, Twitter } from 'react-feather';
import { Link } from 'react-router-dom';
import { Form, FormGroup, Input, Label } from 'reactstrap';
import { Btn, H4, H6, P, UL, LI } from '../../../AbstractElements';
import { CreateAccount, EmailAddress, ForgotPassword, Signinaccount, Password, RememberPassword } from '../../../Constant';
import { loginUser, verifyTwoFactor } from '../../../api/auth'; // Import des fonctions API
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    // États pour la connexion
    const [showPass, setShowPass] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    // États pour la 2FA
    const [is2FARequired, setIs2FARequired] = useState(false);
    const [qrCode, setQrCode] = useState(''); //  pour stocker le QR Code
    const [userId, setUserId] = useState(null);
    const [otp, setOtp] = useState('');

    const navigate = useNavigate(); // Pour rediriger l'utilisateur après succès

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await loginUser(email, password);
            console.log("Réponse du backend:", data);

            // Si le backend renvoie un QR Code pour activer le 2FA
            if (data.message === "2FA activé" && data.qrCode) {
                setQrCode(data.qrCode); // Stocker le QR Code reçu
                setUserId(data.userId);
                setMessage("Scan this QR code with your authenticator app to enable 2FA.");
            } else if (data.message === "2FA requis" && data.userId) {
                setIs2FARequired(true);
                setUserId(data.userId);
                setMessage("Veuillez saisir le code OTP envoyé à votre application.");
            } else if (data.token) {
                setMessage("Connexion réussie !");
                localStorage.setItem('token', data.token);
                navigate('/tivo/dashboard/default'); // Redirige vers la page d'accueil
            }
        } catch (error) {
            console.error("Erreur lors de la connexion:", error);
            setMessage(error.response?.data || "Erreur lors de la connexion");
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const data = await verifyTwoFactor(email, otp);
            console.log("Réponse de vérification 2FA:", data);
            if (data.message === "2FA vérifié") {
                console.log("OTP vérifié, redirection...");
                setMessage("Authentification à deux facteurs réussie !");
                localStorage.setItem('token', data.token);
                navigate('/dashboard/default'); // Redirige vers la page d'accueil
            } else {
                setMessage("Code OTP invalide");
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du OTP:", error);
            setMessage(error.response?.data || "Erreur lors de la vérification du OTP");
        }
    };
    

    return (
        <div className="login-main">
            {/* Affichage du formulaire de connexion initial si aucun QR Code n'est présent */}
            {!qrCode && !is2FARequired ? (
                <Form className="theme-form login-form" onSubmit={handleSubmit}>
                    <div className="login-header text-center">
                        <H4>{Signinaccount}</H4>
                        <P>Enter your email & password to login</P>
                    </div>
                    <FormGroup>
                        <Label>{EmailAddress}</Label>
                        <Input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                            placeholder="Test@gmail.com" 
                        />
                    </FormGroup>
                    <FormGroup className="position-relative pass-hide">
                        <Label>{Password}</Label>
                        <Input 
                            className="form-control" 
                            type={showPass ? "text" : "password"} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            placeholder="*********" 
                        />
                        <div className="show-hide">
                            <span className="show" onClick={() => setShowPass(!showPass)}></span>
                        </div>
                    </FormGroup>
                    <FormGroup>
                        <Btn attrBtn={{ color: 'primary', className: 'w-100', type: 'submit' }}>SIGN IN</Btn>
                    </FormGroup>
                    {message && <P attrPara={{ className: 'text-center mt-4 mb-0' }}>{message}</P>}
                </Form>
            ) : qrCode ? (
                // Affichage du QR Code pour le 2FA
                <div className="qr-code-container text-center">
                    <H4>Scan this QR Code</H4>
                    <P>Utilisez votre application d'authentification pour scanner ce code QR.</P>
                    <img src={qrCode} alt="QR Code" style={{ width: '200px', height: '200px', margin: '20px auto' }} />
                    <P>Une fois scanné, entrez le code OTP généré dans le champ ci-dessous.</P>
                    {/* Affichage du champ OTP dès le scan du QR code */}
                    <Form className="theme-form login-form mt-4" onSubmit={handleVerifyOtp}>
                        <FormGroup>
                            <Label>Code OTP</Label>
                            <Input 
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                placeholder="Entrez le code OTP"
                            />
                        </FormGroup>
                        <FormGroup>
                            <Btn attrBtn={{ color: 'primary', className: 'w-100', type: 'submit' }}>Vérifier le code</Btn>
                        </FormGroup>
                        {message && <P attrPara={{ className: 'text-center mt-4 mb-0' }}>{message}</P>}
                    </Form>
                </div>
            ) : (
                // Si 2FA est requis mais le QR Code n'est pas affiché
                <Form className="theme-form login-form" onSubmit={handleVerifyOtp}>
                    <div className="login-header text-center">
                        <H4>Vérification 2FA</H4>
                        <P>Veuillez entrer le code OTP généré dans votre application d’authentification.</P>
                    </div>
                    <FormGroup>
                        <Label>Code OTP</Label>
                        <Input 
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            placeholder="Entrez le code OTP"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Btn attrBtn={{ color: 'primary', className: 'w-100', type: 'submit' }}>Vérifier le code</Btn>
                    </FormGroup>
                    {message && <P attrPara={{ className: 'text-center mt-4 mb-0' }}>{message}</P>}
                </Form>
            )}
        </div>
    );
};

export default LoginForm;