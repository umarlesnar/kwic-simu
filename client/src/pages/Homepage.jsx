import React from "react";
import { Link } from "react-router-dom";

const buttonNames = [
  { name: "Whatsapp", path: "/whatsapp" },
  { name: "IG", path: "/whatsapp" },
  { name: "Telegram", path: "/whatsapp" },
  { name: "Facebook Ads", path: "/whatsapp" },
];

const Homepage = () => {
  return (
    <div className="min-h-screen h-auto bg-green-400">
      <h1 className="px-4 pt-4 pb-2 font-semibold text-gray-800 text-center text-2xl">
        App Sandbox
      </h1>
      <div className="md:w-[95%] mx-auto p-6 md:p-12 ">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
          {buttonNames?.map((item, index) => (
            <div key={index}>
              <Link to={item.path}>
                <button className="rounded-lg w-full border border-transparent px-2.5 py-2 md:py-3 text-base font-medium bg-gray-900 text-white hover:border-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500">
                  {item.name}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Homepage;
