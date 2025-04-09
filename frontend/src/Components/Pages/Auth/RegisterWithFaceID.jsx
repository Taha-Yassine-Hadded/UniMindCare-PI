import { useState } from "react";
import Swal from "sweetalert2";
import { Form, FormGroup, Input, Label } from "reactstrap";
import { Btn, H4, P } from "../../../AbstractElements";
import { BoutonFaceId } from "../../../Constant";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const RegisterWithFaceID = () => {
  const [formData, setFormData] = useState({ name: "", identifiant: "" });
  const navigate = useNavigate(); // Initialize the navigate function

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFaceIDRegistration = async () => {
    if (!formData.name || !formData.identifiant) {
      Swal.fire("Error", "Please enter your name and ID.", "error");
      return;
    }

    // Display an alert with FaceID instructions
    Swal.fire({
      title: "Position yourself correctly!",
      text: "Make sure your face is well centered. Change face angles and press 'C' each time to capture an image.",
      icon: "info",
      confirmButtonText: "OK, Start",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // 🔹 Step 1: Send data to Flask for image capture
          const flaskResponse = await fetch("http://localhost:5002/register_with_faceid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: formData.name, identifiant: formData.identifiant }),
          });

          const flaskData = await flaskResponse.json();
          if (!flaskResponse.ok) throw new Error(flaskData.error || "Unknown error");

          // 🔹 Step 2: Save data in MongoDB through Express
          const expressResponse = await fetch("http://localhost:5000/api/registerUserFaceID", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          const expressData = await expressResponse.json();
          if (!expressResponse.ok) throw new Error(expressData.error || "Unknown error");

          Swal.fire("Success", "FaceID registration successful!", "success").then(() => {
            // Redirect to the login page after success
            navigate(`${process.env.PUBLIC_URL}/login`);
          });
        } catch (error) {
          Swal.fire("Error", error.message, "error");
        }
      }
    });
  };

  return (
    <div className="login-main">
      <Form className="theme-form login-form">
        <div className="login-header text-center">
          <H4>Create your account</H4>
          <P>Enter your personal details to create account</P>
        </div>
        <FormGroup>
          <Label>Name</Label>
          <Input
            className="form-control"
            type="text"
            name="name"
            required
            onChange={handleChange}
            placeholder="Enter your name"
          />
        </FormGroup>
        <FormGroup>
          <Label>Identifiant</Label>
          <Input
            className="form-control"
            type="text"
            name="identifiant"
            required
            onChange={handleChange}
            placeholder="Enter your identifiant"
          />
        </FormGroup>
        <FormGroup>
          <Btn
            attrBtn={{
              color: "primary",
              className: "w-100",
              type: "button",
              onClick: handleFaceIDRegistration,
            }}
          >
            {BoutonFaceId}
          </Btn>
        </FormGroup>
      </Form>
    </div>
  );
};

export default RegisterWithFaceID;
