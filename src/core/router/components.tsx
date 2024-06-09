import React from "react";
import { usePageError } from "./error";
import { useNavigation } from "./routing";

const ERROR_STYLES: React.CSSProperties = {
  width: "100%",
  height: "90vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

type ErrorComponentProps = {
  status: number;
  message: string;
};

function ErrorComponent({ status, message }: ErrorComponentProps) {
  return (
    <div style={ERROR_STYLES}>
      <h1>{`${status} | ${message}`}</h1>
    </div>
  );
}

export function NotFound() {
  return <ErrorComponent status={404} message="Not Found" />;
}

export function ErrorPage() {
  const { status, message = "Something went wrong" } = usePageError();
  return <ErrorComponent status={status} message={message} />;
}

type LinkProps = Omit<React.HTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
};

export function Link(props: LinkProps) {
  const { onClick, replace, to, ...rest } = props;
  const { navigate } = useNavigation();

  return (
    <a
      {...rest}
      href={to}
      onClick={(ev) => {
        ev.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}
