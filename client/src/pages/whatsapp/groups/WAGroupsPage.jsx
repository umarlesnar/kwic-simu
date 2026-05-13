import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoArrowLeft } from "react-icons/go";
import { Link } from "react-router-dom";
import GroupsTable from "./components/table/GroupsTable";
import GroupCreationForm from "./components/GroupCreationForm";
import GroupDetailsModal from "./components/GroupDetailsModal";
import axios from "axios";
import { io } from "socket.io-client";

function WAGroupsPage() {
  const { phone_number_id } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    total_count: 0,
  });

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
      // Subscribe to group topic
      socket.emit("subscribe", `group/${phone_number_id}`);
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
      // Remove deleted group
      setGroups((prev) =>
        prev.filter((g) => g.id !== data.group_id)
      );
    } else if (data.type === "group_participants_add" || data.type === "group_participants_remove") {
      // Update group participants
      setGroups((prev) =>
        prev.map((g) =>
          g.id === data.group_id
            ? { ...g, total_participant_count: data.total_participant_count || g.total_participant_count }
            : g
        )
      );
      // Refresh selected group details
      if (selectedGroup && selectedGroup.id === data.group_id) {
        fetchGroupDetails(data.group_id);
      }
    } else {
      // Update or add group
      setGroups((prev) => {
        const existing = prev.find((g) => g.id === data.id);
        if (existing) {
          return prev.map((g) => (g.id === data.id ? data : g));
        } else {
          return [data, ...prev];
        }
      });
    }
  };

  // Fetch groups
  const fetchGroups = async (limit = 10, offset = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJ3YmFfaWQiOiIxMTAwMDAwMDAwMDAxIiwiYXBwX2lkIjoiMTQwMDAwMDAwMSJ9"}`,
          },
        }
      );
      setGroups(response.data.data || []);
      setPagination(response.data.paging || { limit, offset, total_count: 0 });
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
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
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
      fetchGroups();
    }
  }, [phone_number_id]);

  // Handle group creation
  const handleGroupCreated = (newGroup) => {
    setGroups([newGroup, ...groups]);
    setShowCreateForm(false);
    // Refresh to get updated data
    fetchGroups();
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
  const handlePageChange = (newOffset) => {
    fetchGroups(pagination.limit, newOffset);
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              pagination={pagination}
              onPageChange={handlePageChange}
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
