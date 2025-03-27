import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import swal from 'sweetalert';

const authHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.warn('No authentication token found!');
    return { 'Content-Type': 'application/json' };
  }
  console.log('Token used:', token.substring(0, 20) + '...');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Auth-FaceID': 'true',
  };
};

const ChangePassword = () => {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange', // Validate on change to ensure errors update dynamically
  });
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;
  const [isLoading, setIsLoading] = useState(false);

  // Watch fields for validation
  const newPassword = watch('newPassword');
  const currentPassword = watch('currentPassword');
  const confirmPassword = watch('confirmPassword');

  // Debug form values
  console.log('Form Values:', { currentPassword, newPassword, confirmPassword });
  console.log('Errors:', errors);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        swal('Error', 'Your session appears to have expired. Please log in again.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      console.log('Token used for password change:', token.substring(0, 20) + '...');
      console.log('Submitting data:', data);

      const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          Password: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error during password update:', response.status, errorText);
        if (response.status === 401 || errorText.includes('current password')) {
          throw new Error('The current password is incorrect');
        }
        throw new Error(`Error during update (${response.status})`);
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        ...updatedUser,
        Identifiant: updatedUser.Identifiant || identifiant,
      }));

      swal('Success', 'Password updated successfully', 'success').then(() => {
        reset(); // Reset the form after successful submission
        window.location.reload();
      });
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.message.includes('jwt')) {
        swal('Authentication Error', 'Your session has expired. Please log in again.', 'error').then(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        });
      } else {
        swal('Error', error.message || 'Update failed', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h4>Change Password</h4>
      </CardHeader>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <CardBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  {...register('currentPassword', {
                    required: 'Current password is required',
                    minLength: {
                      value: 6,
                      message: 'Current password must be at least 6 characters long',
                    },
                  })}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  disabled={isLoading}
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
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'New password must be at least 8 characters long',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    },
                  })}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                {errors.newPassword && <span style={{ color: 'red' }}>{errors.newPassword.message}</span>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm the new password',
                    validate: (value) => value === newPassword || 'Passwords do not match',
                  })}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword.message}</span>}
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
        <CardFooter className="text-end">
          <Button color="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};

export default ChangePassword;