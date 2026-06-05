import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RoomEntry from "@/pages/RoomEntry";
import Canvas from "@/pages/Canvas";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RoomEntry />,
  },
  {
    path: "/canvas/:roomId",
    element: <Canvas />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
