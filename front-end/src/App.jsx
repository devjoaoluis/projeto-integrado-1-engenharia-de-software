import {Sidebar} from './components/Sidebar';
import {Header} from './components/Header';
import './App.css';

export default function App() {
  return (
    <div className='home'>
      <Sidebar />
      <Header />
    </div>
  );
}