import { useState } from "react";
import { Form, FormGroup, Input, Label, Media } from "reactstrap";
import Swal from "sweetalert2";

const AddUserForm = ({ onUserAdded, toggler }) => {
  const [formData, setFormData] = useState({
    Name: "",
    Identifiant: "",
    Email: "",
    Password: "",
    Classe: "",
    Role: "student",
    PhoneNumber: "",
    Enabled: true,
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const [isClasseDisabled, setIsClasseDisabled] = useState(false);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setFormData({ ...formData, Role: selectedRole });
    setIsClasseDisabled(selectedRole !== "student");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.Email.endsWith("@esprit.tn")) {
      setError("Email must end with @esprit.tn");
      return;
    }

    const dataToSend = {
      Name: formData.Name,
      Identifiant: formData.Identifiant,
      Email: formData.Email,
      Password: formData.Password,
      Classe: formData.Role === "student" ? formData.Classe : "",
      Role: formData.Role,
      PhoneNumber: formData.PhoneNumber,
      Enabled: formData.Enabled,
    };

    try {
      const response = await fetch("http://localhost:5000/api/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const message = await response.text();
        console.error("Server error:", message);
        setError(message);
      } else {
        // Reset form
        setFormData({
          Name: "",
          Identifiant: "",
          Email: "",
          Password: "",
          Classe: "",
          Role: "student",
          PhoneNumber: "",
          Enabled: true,
        });

        // Show success alert and close modal after 5 seconds
        Swal.fire({
          title: "User Added Successfully!",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        }).then(() => {
          if (toggler) toggler(); // Close the modal after the alert
          if (onUserAdded) onUserAdded(); // Refresh the table and chart
        });
      }
    } catch (err) {
      console.error("Server error:", err);
      setError("Server error. Please try again.");
    }
  };

  return (
    <div className="login-main">
      <Form className="theme-form login-form" onSubmit={handleSubmit}>

        {error && <p className="text-danger">{error}</p>}
        {/* Removed success message since it will be handled by Swal */}

        <FormGroup>
          <Label>Full Name <span style={{ color: "red" }}>*</span></Label>
          <Input type="text" name="Name" required value={formData.Name} onChange={handleChange} placeholder="Full Name" />
        </FormGroup>

        <FormGroup>
          <Label>Identifier <span style={{ color: "red" }}>*</span></Label>
          <Input type="text" name="Identifiant" required value={formData.Identifiant} onChange={handleChange} placeholder="Unique Identifier" />
        </FormGroup>

        <FormGroup className="form-group position-relative">
          <Label className="col-form-label">Email <span style={{ color: "red" }}>*</span></Label>
          <Input type="email" name="Email" required placeholder="Email" value={formData.Email} onChange={handleChange} />
        </FormGroup>

        <FormGroup>
          <Label>Password <span style={{ color: "red" }}>*</span></Label>
          <Input type="password" name="Password" required value={formData.Password} onChange={handleChange} placeholder="********" />
        </FormGroup>

        <FormGroup>
          <Label>Role <span style={{ color: "red" }}>*</span></Label>
          <Input type="select" name="Role" value={formData.Role} onChange={handleRoleChange} required>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="psychiatre">Psychologist</option>
          </Input>
        </FormGroup>

        {!isClasseDisabled && (
          <FormGroup>
            <Label>Class <span style={{ color: "red" }}>*</span></Label>
            <Input type="text" name="Classe" value={formData.Classe} onChange={handleChange} placeholder="e.g., 3A" required />
          </FormGroup>
        )}

        <FormGroup>
          <Label>Phone Number <span style={{ color: "red" }}>*</span></Label>
          <Input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleChange} placeholder="e.g., +216 12 345 678" required />
        </FormGroup>

        <FormGroup style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Label style={{ marginBottom: 0 }}>Enabled</Label>
          <Media body className="icon-state">
            <Label className="switch" style={{ marginBottom: 0 }}>
              <Input type="checkbox" name="Enabled" checked={formData.Enabled} onChange={handleChange} />
              <span className="switch-state"></span>
            </Label>
          </Media>
        </FormGroup>

        <FormGroup>
          <button type="submit" className="btn btn-primary">Add User</button>
        </FormGroup>
      </Form>
    </div>
  );
};

export default AddUserForm;