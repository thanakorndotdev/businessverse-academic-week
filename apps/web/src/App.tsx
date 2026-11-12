// DIRECTION CONTRACT: An academic field guide for a live business challenge. Cream paper,
// deep marine navigation, warm UBS gold, precise round department diagrams. Large compact
// display type, Thai-first operational copy, clear per-team targets. First viewport shows
// eight skills as a connected business and one primary next action. UI remains semantic;
// no generated imagery or invented event claims. Touch-sized controls and persistent progress.
// FINISH: build ends with finish review, its verdict, and DESIGN.md.
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Shell } from "./components/Shell";
import { Hub } from "./features/player-hub/Hub";
import { Passport } from "./features/player-hub/Passport";
import { Guide } from "./features/player-hub/Guide";
import { Auth } from "./features/player-hub/Auth";
import { Quiz, DepartmentDetail } from "./features/department-quiz/Quiz";
import { Admin } from "./features/admin-dashboard/Admin";
import { Final } from "./features/final-round/Final";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: true },
  },
});
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Hub />} />
              <Route path="passport" element={<Passport />} />
              <Route path="guide" element={<Guide />} />
              <Route path="join" element={<Auth />} />
              <Route path="departments/:slug" element={<DepartmentDetail />} />
              <Route path="play/:slug" element={<Quiz />} />
              <Route path="final" element={<Final />} />
              <Route path="admin" element={<Admin />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>404</h1>
                    <p>ไม่พบหน้านี้ · Page not found</p>
                    <Link className="button primary" to="/">
                      กลับสู่สนามธุรกิจ · Back to the hub
                    </Link>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}
