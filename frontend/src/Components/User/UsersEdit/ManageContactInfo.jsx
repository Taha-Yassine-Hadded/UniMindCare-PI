import React from 'react';
import { useForm } from 'react-hook-form';
import { Row, Col, Card, CardHeader, CardBody, CardFooter, Form, FormGroup, Label, Input, Button } from 'reactstrap';
import swal from 'sweetalert';

const authHeader = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.warn('Aucun token d\'authentification trouvé!');
    return { 'Content-Type': 'application/json' };
  }
  console.log('Token utilisé:', token.substring(0, 20) + '...');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Auth-FaceID': 'true',
  };
};

const ManageContactInfo = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const storedUser = JSON.parse(localStorage.getItem('user'));
  const identifiant = storedUser?.Identifiant || storedUser?.identifiant;

  // Set initial phone number value
  React.useEffect(() => {
    if (storedUser) {
      setValue('PhoneNumber', storedUser.PhoneNumber || '');
    }
  }, [storedUser, setValue]);

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        swal('Erreur', 'Votre session semble avoir expiré. Veuillez vous reconnecter.', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      console.log('Token utilisé pour la mise à jour du numéro de téléphone:', token.substring(0, 20) + '...');

      const response = await fetch(`http://localhost:5000/api/users/${identifiant}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          PhoneNumber: data.PhoneNumber,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur HTTP lors de la mise à jour du numéro de téléphone:', response.status, errorText);
        throw new Error(`Erreur lors de la mise à jour (${response.status})`);
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        ...updatedUser,
        Identifiant: updatedUser.Identifiant || identifiant,
      }));

      swal('Succès', 'Numéro de téléphone mis à jour avec succès', 'success').then(() => {
        window.location.reload();
      });
    } catch (error) {
      console.error('Erreur de mise à jour du numéro de téléphone :', error);
      if (error.message.includes('jwt')) {
        swal('Erreur d\'authentification', 'Votre session a expiré. Veuillez vous reconnecter.', 'error').then(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        });
      } else {
        swal('Erreur', 'Échec de la mise à jour: ' + error.message, 'error');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <h4>Manage Contact Info</h4>
      </CardHeader>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <CardBody>
          <Row>
            <Col md="6">
              <FormGroup>
                <Label>Phone Number</Label>
                <Input
                  type="text"
                  {...register('PhoneNumber', {
                    required: 'Le numéro de téléphone est requis',
                    pattern: {
                      value: /^[0-9]{8,10}$/,
                      message: 'Le numéro de téléphone doit être valide (8 à 10 chiffres)',
                    },
                  })}
                  placeholder="Entrez votre numéro de téléphone"
                />
                {errors.PhoneNumber && <span style={{ color: 'red' }}>{errors.PhoneNumber.message}</span>}
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
        <CardFooter className="text-end">
          <Button color="primary" type="submit">
            Update Phone Number
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};

export default ManageContactInfo;