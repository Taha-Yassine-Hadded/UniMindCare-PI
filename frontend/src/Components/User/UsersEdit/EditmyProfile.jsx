import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardBody, Form, FormGroup, Label, Input, Button, Row, Col } from 'reactstrap';
import swal from 'sweetalert';
import { useOutletContext } from 'react-router-dom';

const authHeader = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    console.warn("No authentication token found!");
    return { "Content-Type": "application/json" };
  }
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    'X-Auth-FaceID': 'true',
  };
};

const EditMyProfile = () => {
  const { userData } = useOutletContext() || {};
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset, setValue } = useForm({
    mode: "onSubmit",
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });
  
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const storedUser = JSON.parse(localStorage.getItem('user')) || userData;
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  // Watch the new password field for validation
  const newPassword = watch('newPassword');
  
  // Check password requirements in real-time
  useEffect(() => {
    if (newPassword) {
      setPasswordRequirements({
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
      });
    } else {
      setPasswordRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      });
    }
  }, [newPassword]);

  useEffect(() => {
    const syncAuthState = () => {
      const localToken = localStorage.getItem("token");
      const sessionToken = sessionStorage.getItem("token");
      if (sessionToken && !localToken) {
        localStorage.setItem("token", sessionToken);
      } else if (localToken && !sessionToken) {
        sessionStorage.setItem("token", localToken);
      }
      if (!localToken && !sessionToken) {
        return false;
      }
      return true;
    };

    const isLoggedIn = syncAuthState();
    if (!isLoggedIn) {
      swal("Session Expired", "Please log in again", "warning").then(() => {
        window.location.href = "/login";
      });
    }

    if (storedUser) {
      setTwoFactorEnabled(storedUser.twoFactorEnabled || false);
    }
  }, [storedUser]);

  const handleGenerate2FA = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Error", "Your session has expired. Please log in again.", "error");
        return;
      }

      const response = await fetch('http://localhost:5000/api/users/generate-2fa', {
        method: 'GET',
        headers: authHeader(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error generating QR code (${response.status})`);
      }

      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
    } catch (error) {
      console.error("2FA Generation Error:", error);
      swal("Error", "Failed to generate QR code: " + error.message, "error");
    }
  };

  const handleEnable2FA = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Error", "Your session has expired. Please log in again.", "error");
        return;
      }

      if (!twoFactorCode || twoFactorCode.trim() === '') {
        swal("Error", "Please enter a verification code", "error");
        return;
      }

      const response = await fetch('http://localhost:5000/api/users/enable-2fa', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ code: twoFactorCode }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error activating 2FA (${response.status})`);
      }

      const data = await response.json();
      setTwoFactorEnabled(true);
      setQrCodeUrl(null);
      setTwoFactorCode('');

      const updatedUser = { ...storedUser, twoFactorEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal("Success", "2FA successfully activated", "success");
    } catch (error) {
      console.error("2FA Activation Error:", error);
      swal("Error", "Failed to activate 2FA: " + error.message, "error");
    }
  };

  const onSubmit = async (data) => {
    setFormSubmitted(true);
    
    console.log("Form submitted with data:", data);
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        swal("Error", "Your session has expired. Please log in again.", "error").then(() => {
          window.location.href = "/login";
        });
        return;
      }

      // Check if passwords are filled
      if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
        swal("Error", "All password fields are required", "error");
        setFormSubmitted(false);
        return;
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
      if (!passwordRegex.test(data.newPassword)) {
        swal("Error", "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character", "error");
        setFormSubmitted(false);
        return;
      }

      if (data.newPassword !== data.confirmPassword) {
        swal("Error", "Passwords don't match", "error");
        setFormSubmitted(false);
        return;
      }

      const payload = {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      };
      
      console.log("Sending payload to server:", payload);

      const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error from server:", errorData);
        throw new Error(errorData.message || `Update failed (${response.status})`);
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));

      swal("Success", "Password updated successfully", "success").then(() => {
        reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setFormSubmitted(false);
      });
    } catch (error) {
      console.error("Password update error:", error.message);
      
      if (error.message.includes("User not found")) {
        swal("Error", "User not found", "error");
      } else if (error.message.includes("Current password is required")) {
        swal("Error", "Current password is required to update password", "error");
      } else if (error.message.includes("Current password is incorrect")) {
        swal("Error", "Current password is incorrect", "error");
      } else if (error.message.includes("jwt") || error.message.includes("Token")) {
        swal("Authentication Error", "Your session has expired. Please log in again.", "error").then(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = "/login";
        });
      } else {
        swal("Error", "Failed to update password: " + error.message, "error");
      }
      
      setFormSubmitted(false);
    }
  };

  // Clear validation errors when user types in fields
  const handleInputChange = (field) => (e) => {
    setValue(field, e.target.value, { shouldValidate: false });
  };

  return (
    <Card>
      <CardHeader>
        <h4>Edit Profile</h4>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  {...register('currentPassword', { 
                    required: "Current password is required" 
                  })}
                  placeholder="Current password"
                  autoComplete="current-password"
                  onChange={handleInputChange('currentPassword')}
                />
                {errors.currentPassword && <span style={{ color: 'red' }}>{errors.currentPassword.message}</span>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>New Password</Label>
                <Input
                  type="password"
                  {...register('newPassword', {
                    required: "New password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
                      message: "Password must contain uppercase, lowercase, number and special character",
                    },
                  })}
                  placeholder="New password"
                  autoComplete="new-password"
                  onChange={handleInputChange('newPassword')}
                />
                {errors.newPassword && <span style={{ color: 'red' }}>{errors.newPassword.message}</span>}
              </FormGroup>
              
              {/* Password requirements checklist */}
              <div style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.3rem' }}>Password requirements:</p>
                <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>
                  <li style={{ color: passwordRequirements.length ? 'green' : 'grey' }}>
                    At least 8 characters {passwordRequirements.length && '✓'}
                  </li>
                  <li style={{ color: passwordRequirements.uppercase ? 'green' : 'grey' }}>
                    At least one uppercase letter (A-Z) {passwordRequirements.uppercase && '✓'}
                  </li>
                  <li style={{ color: passwordRequirements.lowercase ? 'green' : 'grey' }}>
                    At least one lowercase letter (a-z) {passwordRequirements.lowercase && '✓'}
                  </li>
                  <li style={{ color: passwordRequirements.number ? 'green' : 'grey' }}>
                    At least one number (0-9) {passwordRequirements.number && '✓'}
                  </li>
                  <li style={{ color: passwordRequirements.special ? 'green' : 'grey' }}>
                    At least one special character {passwordRequirements.special && '✓'}
                  </li>
                </ul>
              </div>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  {...register('confirmPassword', {
                    required: "Please confirm your new password",
                    validate: value => value === newPassword || "Passwords don't match",
                  })}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  onChange={handleInputChange('confirmPassword')}
                />
                {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword.message}</span>}
              </FormGroup>
            </Col>
            <Col md="12" className="text-end">
              <Button 
                color="primary" 
                type="submit" 
                disabled={isSubmitting || formSubmitted}
              >
                {isSubmitting || formSubmitted ? 'Updating...' : 'Update Password'}
              </Button>
            </Col>
          </Row>
        </Form>

        <FormGroup className="mt-3">
          <Label>Two-Factor Authentication (2FA)</Label>
          {twoFactorEnabled ? (
            <p style={{ color: 'green' }}>2FA is enabled</p>
          ) : (
            <>
              <Button color="secondary" onClick={handleGenerate2FA} disabled={qrCodeUrl}>
                Enable 2FA
              </Button>
              {qrCodeUrl && (
                <div className="mt-3">
                  <p>Scan this QR code with an authentication app (e.g., Google Authenticator):</p>
                  <img src={qrCodeUrl} alt="QR Code 2FA" />
                  <FormGroup className="mt-2">
                    <Label>Enter 2FA Code</Label>
                    <Input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="6-digit code"
                    />
                  </FormGroup>
                  <Button color="primary" onClick={handleEnable2FA}>
                    Verify and Enable 2FA
                  </Button>
                </div>
              )}
            </>
          )}
        </FormGroup>
      </CardBody>
    </Card>
  );
};

export default EditMyProfile;