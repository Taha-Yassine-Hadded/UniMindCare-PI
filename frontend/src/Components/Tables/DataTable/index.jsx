import React, { Fragment, useState, useEffect, useRef } from "react";
import { Btn, Breadcrumbs, Spinner } from "../../../AbstractElements";
import DataTable from "react-data-table-component";
import { Container, Row, Col, Card, CardBody, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Input } from "reactstrap";
import axios from "axios";
import BasicAreaChartClass from "../../Charts/apexCharts/BasicAreaChartClass";
import CommonModal from "../../UiKits/Modals/common/modal";
import AddUserForm from "./AddUserForm";

const DataTablesContain = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filter, setFilter] = useState("student");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState(false);
  const toggle = () => setModal(!modal);
  const user_endpoint = "http://localhost:5000/api/users";

  const formRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${user_endpoint}`);
      setUsers(response.data);
      setFilteredUsers(response.data.filter((user) => user.Role.includes("student")));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
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

export default DataTablesContain;