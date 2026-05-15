import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
import { Link } from "react-router-dom";
import GroupsTable from "./components/table/GroupsTable";
import GroupCreationForm from "./components/GroupCreationForm";
import GroupDetailsModal from "./components/GroupDetailsModal";
import PendingCreationsSection from "./components/PendingCreationsSection";
import axios from "axios";
import { io } from "socket.io-client";

function readWbaIdFromToken() {
  try {
    const t = localStorage.getItem("token");
    if (!t) return "1100000000001";
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload.wba_id || "1100000000001";
  } catch {
    return "1100000000001";
  }
}
function WAGroupsPage() {
  const { phone_number_id } = useParams();
  const wba_id = readWbaIdFromToken();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 10,
    after: null,
    before: null,
    hasNext: false,
    hasPrev: false,
  });
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected");
      socket.emit("subscribe", { topic: `group/${phone_number_id}` });
    });

    socket.on("topic-data", (data) => {
      console.log("Received topic-data:", data);
      if (data.topic === `group/${phone_number_id}`) {
        handleRealtimeUpdate(data.data);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [phone_number_id]);

  // Handle real-time updates
  const handleRealtimeUpdate = (data) => {
    if (data.type === "group_delete") {
      setGroups((prev) =>
        prev.filter((g) => g.id !== data.group_id)
      );
    } else if (data.type === "group_participants_add" || data.type === "group_participants_remove") {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === data.group_id
            ? { ...g, total_participant_count: data.total_participant_count ?? g.total_participant_count }
            : g
        )
      );
      if (selectedGroup && selectedGroup.id === data.group_id) {
        fetchGroupDetails(data.group_id);
      }
    } else {
      setGroups((prev) => {
        const existing = prev.find((g) => g.id === data.id);
        if (existing) {
          return prev.map((g) => (g.id === data.id ? { ...data, type: undefined } : g));
        }
        const { type: _t, ...rest } = data;
        return [{ ...rest }, ...prev];
      });
    }
  };

  // Fetch groups
  const fetchGroups = async (opts = {}) => {
    const limit = opts.limit ?? pagination.limit ?? 10;
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limit) });
      if (opts.after) params.set("after", opts.after);
      if (opts.before) params.set("before", opts.before);
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
          },
        }
      );
      const groupsPayload = response.data?.data?.groups ?? response.data?.data ?? [];
      setGroups(groupsPayload);
      const p = response.data?.paging || {};
      setPagination({
        limit,
        after: p.cursors?.after ?? null,
        before: p.cursors?.before ?? null,
        hasNext: !!p.next,
        hasPrev: !!p.previous,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  // Fetch group details
  const fetchGroupDetails = async (groupId) => {
    try {
      const response = await axios.get(
        `/v14.0/${groupId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
          },
        }
      );
      setSelectedGroup(response.data);
    } catch (err) {
      console.error("Error fetching group details:", err);
    }
  };

  // Initial load
  useEffect(() => {
    if (phone_number_id) {
      fetchGroups({ limit: 10 });
    }
  }, [phone_number_id]);

  // Handle group creation
  const handleGroupCreated = (payload) => {
    if (payload?.request_id) {
      console.info("Group create request_id:", payload.request_id);
    }
    setShowCreateForm(false);
    setPendingRefreshTrigger(prev => prev + 1);
    fetchGroups({ limit: pagination.limit || 10 });
  };

  // Handle group deletion
  const handleGroupDeleted = (groupId) => {
    setGroups(groups.filter((g) => g.id !== groupId));
    if (selectedGroup && selectedGroup.id === groupId) {
      setShowDetailsModal(false);
      setSelectedGroup(null);
    }
  };

  // Handle view details
  const handleViewDetails = (group) => {
    fetchGroupDetails(group.id);
    setShowDetailsModal(true);
  };

  // Handle pagination
  const handlePageChange = (direction) => {
    if (direction === "next" && pagination.hasNext) {
      fetchGroups({ limit: pagination.limit, after: pagination.after });
    } else if (direction === "prev" && pagination.hasPrev) {
      fetchGroups({ limit: pagination.limit, before: pagination.before });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container-primary py-2">
          <Link
            to="/whatsapp"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <GoArrowLeft className="text-xl" />
            <span className="font-semibold">Back</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-primary py-3 lg:py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Groups
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
            >
              Create Group
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <PendingCreationsSection 
          wba_id={wba_id}
          phone_number_id={phone_number_id} 
          refreshTrigger={pendingRefreshTrigger}
          onCreationProcessed={() => fetchGroups({ limit: pagination.limit || 10 })}
        />

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading groups...</p>
          </div>
        ) : (
          <>
            <GroupsTable
              groups={groups}
              onViewDetails={handleViewDetails}
              onGroupDeleted={handleGroupDeleted}
              phone_number_id={phone_number_id}
              wba_id={wba_id}
              pagination={pagination}
              onPageChange={handlePageChange}
              onRefresh={() => fetchGroups({ limit: pagination.limit, after: null, before: null })}
            />
          </>
        )}
      </div>

      {/* Create Group Form Modal */}
      {showCreateForm && (
        <GroupCreationForm
          phone_number_id={phone_number_id}
          onClose={() => setShowCreateForm(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}


      {/* Group Details Modal */}
      {showDetailsModal && selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          phone_number_id={phone_number_id}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGroup(null);
          }}
          onGroupUpdated={(updatedGroup) => {
            setSelectedGroup(updatedGroup);
            setGroups(
              groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
            );
          }}
          onGroupDeleted={handleGroupDeleted}
        />
      )}
    </div>
  );
}

export default WAGroupsPage;
