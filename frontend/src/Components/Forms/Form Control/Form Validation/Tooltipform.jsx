import { Btn } from '../../../../AbstractElements';
import { FirstName, LastName, Username, State, City, Zip, SubmitForm } from '../../../../Constant';
import React, { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Col, Form, Label, Input, FormGroup, InputGroup, InputGroupText, Row } from 'reactstrap';

const Tooltipform = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [validateClass, setValidateClass] = useState(false);
  const onSubmit = (e, data) => {
    e.preventDefault();
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
export default Tooltipform;