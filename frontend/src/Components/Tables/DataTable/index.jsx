import React, { Fragment, useState, useEffect, useRef } from "react";
import { Btn, Breadcrumbs, Spinner } from "../../../AbstractElements";
import DataTable from "react-data-table-component";
import { Container, Row, Col, Card, CardBody, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Input } from "reactstrap";
import axios from "axios";
import Swal from 'sweetalert2'; // Import SweetAlert2
import BasicAreaChartClass from "../../Charts/apexCharts/BasicAreaChartClass";
import CommonModal from "../../UiKits/Modals/common/modal";
import AddUserForm from "./AddUserForm";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection

const DataTablesContain = () => {
  const navigate = useNavigate(); // For navigation
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filter, setFilter] = useState("student");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [userRole, setUserRole] = useState(null); // State for user role
  const toggle = () => setModal(!modal);
  const user_endpoint = "http://localhost:5000/api/users";

  const formRef = useRef(null);

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const userResponse = await fetch("http://localhost:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!userResponse.ok) throw new Error(`Erreur HTTP ${userResponse.status}`);
        const userData = await userResponse.json();
        const isAdmin = userData.Role && userData.Role.includes("admin");
        setUserRole(isAdmin ? "admin" : null);

        // If the user is not an admin, redirect to the error page
        if (!isAdmin) {
          navigate("/tivo/error/error-page2", { replace: true });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des données utilisateur :", err);
        setUserRole(null);
        // Redirect to error page on error
        navigate("/tivo/error/error-page2", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [navigate]);

  // Fetch users (only if the user is an admin)
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${user_endpoint}`);
      setUsers(response.data);
      setFilteredUsers(response.data.filter((user) => user.Role.includes("student")));
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Échec de la récupération des utilisateurs : ' + error.message,
        confirmButtonText: 'OK',
      });
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchUsers();
    }
  }, [userRole]);

  useEffect(() => {
    let filtered = users;
    if (filter === "disabled") {
      filtered = users.filter((user) => !user.enabled);
    } else {
      filtered = users.filter((user) => user.Role.includes(filter));
    }
    setFilteredUsers(filtered);
  }, [filter, users]);

  const handleToggleUserStatus = async (userId, enabled) => {
    try {
      const endpoint = enabled ? "disable" : "enable";
      const response = await axios.put(`${user_endpoint}/${endpoint}/${userId}`);
      if (response.status === 200) {
        const updatedUsers = users.map((user) =>
          user._id === userId ? { ...user, enabled: !enabled } : user
        );
        setUsers(updatedUsers);
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: `Utilisateur ${enabled ? 'désactivé' : 'activé'} avec succès`,
          confirmButtonText: 'OK',
        });
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: `Échec de la mise à jour du statut de l'utilisateur : ${error.message}`,
        confirmButtonText: 'OK',
      });
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const filtered = filteredUsers.filter(
        (user) =>
          user.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.Identifiant.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      let filtered = users;
      if (filter === "disabled") {
        filtered = users.filter((user) => !user.enabled);
      } else {
        filtered = users.filter((user) => user.Role.includes(filter));
      }
      setFilteredUsers(filtered);
    }
  }, [searchQuery]);

  const columns = [
    { name: "Name", selector: (row) => row.Name, sortable: true },
    { name: "Identifier", selector: (row) => row.Identifiant, sortable: true },
    { name: "Email", selector: (row) => row.Email, sortable: true },
    { name: "Class", selector: (row) => row.Classe, sortable: true, omit: filter !== "student" },
    { name: "Phone Number", selector: (row) => row.PhoneNumber, sortable: true },
    {
      name: "Status",
      cell: (row) => (
        <Btn
          attrBtn={{
            color: row.enabled ? "danger" : "success",
            onClick: () => handleToggleUserStatus(row._id, row.enabled),
          }}
        >
          {row.enabled ? "Disable" : "Enable"}
        </Btn>
      ),
    },
  ];

  const filterOptions = [
    { label: "Students", value: "student" },
    { label: "Psychologists", value: "psychologist" },
    { label: "Teachers", value: "teacher" },
    { label: "Disabled Accounts", value: "disabled" },
  ];

  const handleUserAdded = () => {
    fetchUsers();
    setModal(false);
  };

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  // Show loading state while fetching user role
  if (loading) {
    return (
      <Container fluid style={styles.loading}>
        <div>Chargement...</div>
      </Container>
    );
  }

  // If userRole is not "admin", the redirection has already happened in useEffect
  // So, we only render the content if userRole is "admin"
  return (
    <Fragment>
      <Breadcrumbs mainTitle="Users Management" parent="Tables" title="Users Management" />
      <Container fluid={true}>
        <Row>
          <Col sm="12">
            <Card>
              <CardBody className="pt-4">
                <Fragment>
                  <Btn attrBtn={{ color: "success", onClick: toggle }}>
                    <i className="fa fa-plus"></i> Add User
                  </Btn>
                  <CommonModal
                    isOpen={modal}
                    title="Add New User"
                    toggler={toggle}
                    size="lg"
                    primaryBtnText="Save"
                    secondaryBtnText="Cancel"
                    onPrimaryBtnClick={handleSave}
                    onSecondaryBtnClick={toggle}
                  >
                    <AddUserForm onUserAdded={handleUserAdded} toggler={toggle} ref={formRef} />
                  </CommonModal>
                </Fragment>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", marginTop: "20px" }}>
                  <Dropdown isOpen={dropdownOpen} toggle={() => setDropdownOpen(!dropdownOpen)}>
                    <DropdownToggle caret>
                      Filter by : {filterOptions.find((opt) => opt.value === filter)?.label || "Students"}
                    </DropdownToggle>
                    <DropdownMenu>
                      {filterOptions.map((option) => (
                        <DropdownItem key={option.value} onClick={() => setFilter(option.value)}>
                          {option.label}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>

                  <div style={{ position: "relative", width: "300px" }}>
                    <Input
                      type="text"
                      placeholder="Search by Email or Identifier"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: "40px", width: "100%" }}
                    />
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <i className="fa fa-search"></i>
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center">
                    <div className="loader-box">
                      <Spinner attrSpinner={{ className: "loader-7" }} />
                    </div>
                  </div>
                ) : (
                  <DataTable
                    className="data-tables theme-scrollbar"
                    data={filteredUsers}
                    columns={columns}
                    striped={true}
                    center={true}
                    pagination
                  />
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <BasicAreaChartClass refreshTrigger={handleUserAdded} />
        </Row>
      </Container>
    </Fragment>
  );
};

// Reuse styles for the loading state
const styles = {
  loading: {
    textAlign: "center",
    marginTop: "100px",
    fontSize: "20px",
    color: "#718096",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  },
};

export default DataTablesContain;