import React from 'react'
import { FolderPlus } from 'react-feather';
import HeaderDashboard from './HeaderDashboard';
import Appliacation from './Application';
import Pages from './Pages';
import { Link } from 'react-router-dom'
import {  UL, LI } from '../../../AbstractElements';

const LeftHeader = () => {
  return (
    <div className="left-header col horizontal-wrapper ps-0">
      <div className=" simple-list left-menu-header">
        <UL>
        
        </UL>
      </div>
    </div>
  )
}

export default LeftHeader