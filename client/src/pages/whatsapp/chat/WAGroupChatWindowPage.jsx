import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MdRefresh, MdGroups } from "react-icons/md";
import GroupChatView from "../shared/components/GroupChatView";

const WAGroupChatWindowPage = () => {
  const { phone_number_id, group_id } = useParams();
  const [searchParams] = useSearchParams();
  const wba_id = searchParams.get("wba_id");
  const wa_id = searchParams.get("wa_id"); // The participant we are simulating
  const [refreshKey, setRefreshKey] = useState(0);

  if (!phone_number_id || !group_id || !wa_id) {
    return <div className="p-10 text-center text-red-500 font-bold">Missing parameters for Group Chat Simulation</div>;
  }

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const client = { wa_id };
  const group = { id: group_id, subject: "Group Chat" };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                    <MdGroups className="text-2xl" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Group Chat</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Simulating as {wa_id}</p>
                </div>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Refresh Messages"
            >
              <MdRefresh className="text-xl" />
            </button>
        </div>
        <GroupChatView 
            phone_number_id={phone_number_id}
            wba_id={wba_id}
            client={client}
            group={group}
            refreshKey={refreshKey}
        />
    </div>
  );
};


export default WAGroupChatWindowPage;
