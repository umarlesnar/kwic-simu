import React, { useState } from "react";
import { MdClose, MdGroups, MdArrowBack, MdRefresh, MdOpenInNew } from "react-icons/md";
import GroupChatView from "./GroupChatView";

const GroupChatModal = ({ isOpen, onClose, phone_number_id, wba_id, client, group, onBack }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handlePopout = () => {
    const absolutePath =
      window.location.origin +
      window.location.pathname +
      `#/whatsapp/group-chat/${phone_number_id}/${group.id}?wba_id=${wba_id || "1100000000001"}&wa_id=${client.wa_id}`;
    window.open(
      absolutePath,
      `group-${group.id}`,
      "width=400,height=600"
    );
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <MdArrowBack className="text-xl text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MdGroups className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                {group.subject}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Simulating as {client?.profile?.name || client?.wa_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Refresh Messages"
            >
              <MdRefresh className="text-xl" />
            </button>
            <button
              onClick={handlePopout}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Popout to new window"
            >
              <MdOpenInNew className="text-xl" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors ml-2"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <GroupChatView 
          phone_number_id={phone_number_id}
          wba_id={wba_id}
          client={client}
          group={group}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
};


export default GroupChatModal;
