import React, { useState, useEffect } from 'react';
import { Form, FormGroup, Input, Label } from 'reactstrap';
import { Btn, H4, H6, P } from '../../../AbstractElements';
import { EmailAddress, LoginWithJWT, OrSignInWith, Password, SignIn } from '../../../Constant';
import { useNavigate } from 'react-router-dom';
import { Jwt_token } from '../../../Config/Config';
import man from '../../../assets/images/login/login_bg.jpg';
import { handleResponse } from '../../../Services/fack.backend';
import FormHeader from './FormHeader';
import FormPassword from './FormPassword';

const LoginTab = ({ selected }) => {
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('test123');
  const [togglePassword, setTogglePassword] = useState(false);
  const navigate = useNavigate();
  const [value, setValue] = useState(localStorage.getItem('profileURL') || man);
  const [name, setName] = useState(localStorage.getItem('Name') || 'Emay Walter');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('login') === 'true');

  useEffect(() => {
    localStorage.setItem('profileURL', value);
    localStorage.setItem('Name', name);
  }, [value, name]);

  const loginAuth = async (e) => {
    e.preventDefault();
    if (email !== '' && password !== '') {
      localStorage.setItem('login', 'true');
      setIsLoggedIn(true);
    }
  };

  const loginWithJwt = async (e) => {
    e.preventDefault();
    const requestOptions = { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, password })
    };
    return fetch('/users/authenticate', requestOptions)
      .then(handleResponse)
      .then((user) => {
        setValue(man);
        setName('Emay Walter');
        localStorage.setItem('token', Jwt_token);
        localStorage.setItem('user', JSON.stringify(user));
        setIsLoggedIn(true);
        navigate(`${process.env.PUBLIC_URL}/dashboard/default`);
        return user;
      });
  };

  const loginWithFaceID = async (e) => {
    e.preventDefault(); // Add this to prevent form submission
    try {
      const response = await fetch('http://localhost:5001/faceid_login', {
        method: 'POST',
        credentials: 'include', // Important for CORS
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("FaceID Response:", data); // Debug log
  
      if (data.status === 'success' && data.user) {
        // Store user data
        localStorage.setItem('login', 'true');
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Store auth token if present
        const token = response.headers.get('Authorization');
        if (token) {
          localStorage.setItem('token', token);
        }
  
        // Navigate to dashboard
        navigate(`${process.env.PUBLIC_URL}/dashboard/default`, { replace: true });
      } else {
        console.error("Login failed:", data.message);
        // Optionally show error to user
      }
    } catch (error) {
      console.error("FaceID Login Error:", error);
      // Optionally show error to user
    }
  };

  return (
    <Form className='theme-form'>
      <H4>{selected === 'simpleLogin' ? 'Sign In With Simple Login' : 'Sign In With Jwt'}</H4>
      <P>{'Enter your email & password to login'}</P>
      <FormGroup>
        <Label className='col-form-label'>{EmailAddress}</Label>
        <Input className='form-control' type='email' onChange={(e) => setEmail(e.target.value)} value={email} />
      </FormGroup>
      <FormGroup className='position-relative'>
        <Label className='col-form-label'>{Password}</Label>
        <div className='position-relative'>
          <Input className='form-control' type={togglePassword ? 'text' : 'password'} onChange={(e) => setPassword(e.target.value)} value={password} />
          <div className='show-hide' onClick={() => setTogglePassword(!togglePassword)}>
            <span className={togglePassword ? '' : 'show'}></span>
          </div>
        </div>
      </FormGroup>
      <FormPassword />
      <div>
        {selected === 'simpleLogin' ? (
          <Btn attrBtn={{ color: 'primary', className: 'd-block w-100 mt-2', onClick: loginAuth }}>
            {SignIn}
          </Btn>
        ) : (
          <Btn attrBtn={{ color: 'primary', className: 'd-block w-100 mt-2', onClick: loginWithJwt }}>
            {LoginWithJWT}
          </Btn>
        )}
      </div>
      <div>
        <Btn 
          attrBtn={{ 
            color: 'secondary', 
            className: 'd-block w-100 mt-2', 
            onClick: loginWithFaceID 
          }}
        >
          Sign In with FaceID
        </Btn>
      </div>
      <div className="login-social-title">
        <H6>{OrSignInWith}</H6>
      </div>
      <FormHeader selected={selected} />
    </Form>
  );
};

export default LoginTab;