import Modal from "@/components/Modal";
import { useCreateProjectMutation } from "@/state/api";
import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewBoard = ({ isOpen, onClose }: Props) => {
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const [boardName, setBoardName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!boardName) return;
    await createProject({ name: boardName, description });
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Board">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Board Name"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-800 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:ring-2 focus:ring-gray-600 focus:outline-none dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200 ${
            !boardName || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!boardName || isLoading}
        >
          {isLoading ? "Creating..." : "Create Board"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewBoard;
