import ChatLayout from "../components/ChatLayout";

export default function Dashboard(props) {
  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] w-full max-w-6xl flex-col px-4 pb-8">
      <ChatLayout {...props} />
    </div>
  );
}
