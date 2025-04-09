import { Fragment, useContext, useEffect, useState } from "react";
import CustomizerContext from "../../Helper/Customizer";
import { MENU } from "./Menu";
import SidebarIcon from "./SidebarIcon";
import SimpleBar from "simplebar-react";
import { ArrowLeft, ArrowRight } from "react-feather";
import ConfigDB from "../../Config/ThemeConfig";
import SidebarSubMenu from "./SidebarSubMenu";
import BackBtn from "./BackBtn";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState([]);
  const { togglSidebar } = useContext(CustomizerContext);
  const sidebar_types = localStorage.getItem("sidebar_types");
  const wrapper = sidebar_types || ConfigDB.data.settings.sidebar.type;
  const [margin, setMargin] = useState(0);
  const [leftArrow, setLeftArrow] = useState(false);
  const [rightArrow, setRightArrow] = useState(false);
  const [width, setWidth] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [filteredMenu, setFilteredMenu] = useState(MENU);
  
  // Handle resize for horizontal menu
  const handleResize = () => {
    setWidth(window.innerWidth - 500);
  };
  
  const id = window.location.pathname.split("/").pop();
  const layout = id;
  
  // Get user role from localStorage
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Get the first role from the array, or default to empty string
      const role = user.Role && user.Role.length > 0 ? user.Role[0].toLowerCase() : '';
      setUserRole(role);
      console.log('User role for menu filtering:', role);
    } catch (error) {
      console.error('Error parsing user data for sidebar:', error);
    }
  }, []);
  
  // Improved filtering function - properly handles deeply nested menus
  const filterMenuByRole = (menuItems, role) => {
    if (!role) return menuItems;
    
    return menuItems.map(menuBox => {
      // Create a copy of the menu box
      const newMenuBox = { ...menuBox };
      
      // If this menu box has menus, process them
      if (newMenuBox.menu && newMenuBox.menu.length > 0) {
        // Process each top-level menu item
        newMenuBox.menu = newMenuBox.menu.map(menuItem => {
          // Create a copy of the menu item 
          const newMenuItem = { ...menuItem };
          
          // If this menu item has a submenu, process it
          if (newMenuItem.menu && newMenuItem.menu.length > 0) {
            // Filter submenu items based on userRole
            newMenuItem.menu = newMenuItem.menu.filter(subMenuItem => {
              // Check if this item has a userRole restriction
              if (subMenuItem.userRole) {
                // Keep only if the role matches
                return subMenuItem.userRole === role;
              }
              // Keep items without role restrictions
              return true;
            });
          }
          
          return newMenuItem;
        });
      }
      
      return newMenuBox;
    });
  };
  
  // Filter menu items based on user role
  useEffect(() => {
    if (userRole) {
      console.log('Filtering menu for role:', userRole);
      const filtered = filterMenuByRole(MENU, userRole);
      setFilteredMenu(filtered);
      
      // Debug output to see what's being filtered
      console.log('Original menu structure:', MENU);
      console.log('Filtered menu structure:', filtered);
    } else {
      setFilteredMenu(MENU);
    }
  }, [userRole]);
  
  useEffect(() => {
    setLeftArrow(true);
  }, []);

  useEffect(() => {
    document.querySelector(".left-arrow").classList.add("d-none");
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [layout]);
  
  const scrollToRight = () => {
    if (margin <= -2598 || margin <= -2034) {
      if (width === 492) {
        setMargin(-3570);
      } else {
        setMargin(-3464);
      }
      setRightArrow(true);
      setLeftArrow(false);
    } else {
      setLeftArrow(false);
      setMargin((margin) => (margin += -width));
    }
  };
  
  const scrollToLeft = () => {
    if (margin >= -width) {
      setMargin(0);
      setLeftArrow(true);
      setRightArrow(false);
    } else {
      setMargin((margin) => (margin += width));
      setRightArrow(false);
    }
  };
  
  return (
    <div className={`sidebar-wrapper ${togglSidebar ? "close_icon" : ""} `} id="sidebar-wrapper">
      <div>
        <SidebarIcon />
        <nav className="sidebar-main">
          <div className={`left-arrow ${leftArrow ? "d-none" : ""}`} id="left-arrow" onClick={scrollToLeft}><ArrowLeft /></div>
          <div
            id="sidebar-menu"
            style={wrapper.split(" ").includes("horizontal-wrapper") ? { marginLeft: margin + "px" } : { margin: "0px" }}>
            <ul className="sidebar-links" style={{ display: "block" }} id="simple-bar">
              <SimpleBar style={{ height: "300px" }}>
                <BackBtn/>
                {filteredMenu.map((item, i) => (
                  <Fragment key={i}>
                    <li className={item.className}>
                      <SidebarSubMenu menu={item.menu} isOpen={isOpen} setIsOpen={setIsOpen} level={0} />
                    </li>
                  </Fragment>
                ))}
              </SimpleBar>
            </ul>
          </div>
          <div className={`right-arrow ${rightArrow ? "d-none" : ""}`} onClick={scrollToRight}><ArrowRight /></div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;