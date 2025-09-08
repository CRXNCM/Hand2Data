import React from 'react';

const Navbar = ({ activePage }) => {
  const pageTitle = activePage.charAt(0).toUpperCase() + activePage.slice(1);

  return (
    <div className="flex h-14 items-center justify-between border-b border-gray-700 bg-gray-900/50 px-4 backdrop-blur-md">
      <h1 className="text-lg font-semibold text-white">
        {pageTitle}
      </h1>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-gray-300">
          user@example.com
        </span>
        <img 
          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1480&q=80"
          alt="avatar"
          className="h-8 w-8 rounded-full object-cover border border-gray-600"
        />
      </div>
    </div>
  );
};

export default Navbar;