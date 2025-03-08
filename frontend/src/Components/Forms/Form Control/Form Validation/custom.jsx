import { Btn } from '../../../../AbstractElements';
import { FirstName, LastName, Username, State, City } from '../../../../Constant';
import React, { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { Col, Form, FormGroup, Label, InputGroup, InputGroupText, Input, Row } from 'reactstrap';

const Custom = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = data => {
    if (data !== '') {
      alert('You submitted the form and stuff!');
    } else {
      errors.showMessages();
    }
  };
  return (
    <Fragment>
     
    </Fragment>
  );
};
export default Custom;