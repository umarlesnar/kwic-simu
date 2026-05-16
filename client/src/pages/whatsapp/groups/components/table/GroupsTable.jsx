import React from "react";
import { MdDelete, MdEdit, MdInfo, MdRefresh } from "react-icons/md";
import axios from "axios";
import { WebhookService } from "@api/WebhookService";
import GroupFailedWebhookMenu from "../GroupFailedWebhookMenu";
import { buildGroupDeleteSuccess } from "../../utils/wbGroupFailedWebhooks";
import { resolveWbaIdForPhone } from "../../utils/resolveWbaId";
import { groupsWebhookAuthHeaders } from "../../utils/groupsApiHeaders";

function GroupsTable({
  groups,
  onViewDetails,
  onGroupDeleted,
  phone_number_id,
  wba_id,
  pagination,
  onPageChange,
  onRefresh,
}) {
  const handleDelete = async (group) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        await axios.delete(`/v14.0/${group.id}`, {
          headers: groupsWebhookAuthHeaders(),
        });
        const resolvedWbaId = wba_id || (await resolveWbaIdForPhone(phone_number_id));
        if (resolvedWbaId) {
          await WebhookService.push(
            buildGroupDeleteSuccess(resolvedWbaId, phone_number_id, group)
          );
        }
        onGroupDeleted(group.id);
      } catch (error) {
        console.error("Error deleting group:", error);
        alert("Failed to delete group");
      }
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const timestamp = parseInt(dateValue);
    if (!isNaN(timestamp) && timestamp > 1000000000 && timestamp < 10000000000) {
      return new Date(timestamp * 1000).toLocaleDateString();
    }
    return new Date(dateValue).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Add refresh button header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Groups</h3>
        <button
          onClick={onRefresh}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
          title="Refresh Groups"
        >
          <MdRefresh className="text-lg" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Join Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Sim webhooks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {groups.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No groups found
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr
                  key={group.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {group.subject}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {group.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {group.total_participant_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.join_approval_mode === "approval_required"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {group.join_approval_mode === "approval_required"
                        ? "Approval"
                        : "Open"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(group.creation_timestamp ?? group.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <GroupFailedWebhookMenu
                      phone_number_id={phone_number_id}
                      wba_id={wba_id}
                      group={group}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewDetails(group)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
                        title="View Details"
                      >
                        <MdInfo className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.hasNext || pagination.hasPrev ? (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page navigation (Meta cursor paging)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange("prev")}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange("next")}
              disabled={!pagination.hasNext}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupsTable;
