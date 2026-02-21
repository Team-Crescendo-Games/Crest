import { Board } from "@/state/api"; 
import { BiColumns } from "react-icons/bi";
import Link from "next/link";
import { BOARD_MAIN_COLOR } from "@/lib/entityColors";

type Props = {
  board: Board; 
};

const BoardCard = ({ board }: Props) => {
  return (
    <Link href={`/boards/${board.id}`}>
      <div className="cursor-pointer rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md hover:outline-2 hover:outline-blue-300 dark:bg-dark-secondary dark:hover:outline-blue-600">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <BiColumns
              className="h-4 w-4"
              style={{ color: BOARD_MAIN_COLOR }}
            />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {board.name}
          </h3>
        </div>

        {board.description && (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-neutral-400">
            {board.description}
          </p>
        )}
      </div>
    </Link>
  );
};

export default BoardCard;
