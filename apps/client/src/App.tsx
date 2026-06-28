import { Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/socket-context';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/room/:id"
          element={
            <Layout showBack fullWidth>
              <Room />
            </Layout>
          }
        />
        <Route
          path="*"
          element={
            <Layout showBack>
              <NotFound />
            </Layout>
          }
        />
      </Routes>
    </SocketProvider>
  );
}

export default App;
