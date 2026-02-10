import React from "react";

type Props = {
  name: React.ReactNode;
  description?: string;
  buttonComponent?: React.ReactNode;
  isSmallText?: boolean;
};

const Header = ({
  name,
  description,
  buttonComponent,
  isSmallText = false,
}: Props) => {
  return (
    <div
      className={`flex w-full items-center justify-between ${isSmallText ? "" : "mb-5"}`}
    >
      <div>
        <h1
          className={`${isSmallText ? "text-lg" : "text-2xl"} font-semibold dark:text-white`}
        >
          {name}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {buttonComponent}
    </div>
  );
};

export default Header;
