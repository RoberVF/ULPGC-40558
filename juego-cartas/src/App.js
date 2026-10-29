import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import './App.css';

function App() {
  const [peer, setPeer] = useState(null);
  const [myId, setMyId] = useState('');
  const [hostId, setHostId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(null); // 'host' o 'guest'

  // Estado del juego (El Host es el dueño de la verdad)
  const [game, setGame] = useState({ state: 'lobby', players: [], deckId: null, turnIndex: 0 });

  // Referencias para las conexiones P2P
  const connections = useRef([]); // Para el Host
  const hostConnection = useRef(null); // Para el Guest

  useEffect(() => {
    const newPeer = new Peer();
    newPeer.on('open', id => setMyId(id));
    setPeer(newPeer);
    return () => newPeer.destroy();
  }, []);

  // Lógica del HOST: Escuchar conexiones entrantes
  useEffect(() => {
    if (!peer || role !== 'host') return;

    peer.on('connection', (conn) => {
      conn.on('data', (data) => {
        if (data.type === 'JOIN') {
          setGame(prev => {
            const newState = { ...prev, players: [...prev.players, { name: data.name, hand: [] }] };
            broadcast(newState); // Avisar a todos del nuevo jugador
            return newState;
          });
        }
        if (data.type === 'DRAW') {
          handleDrawCard(); // El Host procesa la petición de robar
        }
      });
      connections.current.push(conn);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, role]);

  // Función del HOST: Enviar estado a todos los invitados
  const broadcast = (state) => {
    connections.current.forEach(conn => conn.send(state));
  };

  // El Host actualiza su estado y lo replica
  useEffect(() => {
    if (role === 'host') broadcast(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, role]);

  // Función del GUEST: Conectarse al Host
  const joinGame = (e) => {
    e.preventDefault();
    if (!hostId || !name) return;

    const conn = peer.connect(hostId);
    conn.on('open', () => {
      conn.send({ type: 'JOIN', name });
      setRole('guest');
    });
    conn.on('data', (newState) => {
      setGame(newState); // El invitado simplemente copia el estado del Host
    });
    hostConnection.current = conn;
  };

  // Función del HOST: Iniciar partida
  const createHost = () => {
    if (!name) return;
    setRole('host');
    setGame({ ...game, players: [{ name, hand: [] }] });
  };

  const startGame = async () => {
    const res = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    const data = await res.json();
    setGame({ ...game, state: 'playing', deckId: data.deck_id });
  };

  // Función unificada para robar carta
  const handleDrawCard = async () => {
    if (role === 'guest') {
      hostConnection.current.send({ type: 'DRAW' }); // Pedir al Host que robe por mí
      return;
    }

    // Solo el Host ejecuta la llamada a la API para mantener el estado sincronizado
    const res = await fetch(`https://deckofcardsapi.com/api/deck/${game.deckId}/draw/?count=1`);
    const data = await res.json();

    if (data.success) {
      setGame(prev => {
        const newPlayers = [...prev.players];
        newPlayers[prev.turnIndex].hand.push(data.cards[0]);
        return {
          ...prev,
          players: newPlayers,
          turnIndex: (prev.turnIndex + 1) % newPlayers.length
        };
      });
    }
  };

  if (!role) {
    return (
      <div className="container">
        <h1>Juego de Cartas (P2P sin Servidor)</h1>
        <div className="lobby-card">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre..." />

          <div style={{ marginTop: '2rem' }}>
            <h3>Crear Partida</h3>
            <p>Tu ID para compartir: <strong>{myId || 'Generando...'}</strong></p>
            <button onClick={createHost} disabled={!myId || !name}>Ser el Host</button>
          </div>

          <hr style={{ margin: '2rem 0' }} />

          <div style={{ marginTop: '2rem' }}>
            <h3>Unirse a Partida</h3>
            <input type="text" value={hostId} onChange={e => setHostId(e.target.value)} placeholder="ID del Host..." />
            <button onClick={joinGame} disabled={!name || !hostId}>Conectarse</button>
          </div>
        </div>
      </div>
    );
  }

  if (game.state === 'lobby') {
    return (
      <div className="container">
        <div className="lobby-card">
          <h2>Sala de Espera ({game.players.length}/4)</h2>
          <p>Tu rol: {role.toUpperCase()}</p>
          {role === 'host' && <p>Comparte este ID: <strong>{myId}</strong></p>}
          <ul className="player-list">
            {game.players.map((p, i) => <li key={i}>👤 {p.name}</li>)}
          </ul>
          {role === 'host' && game.players.length > 0 && (
            <button className="start-btn" onClick={startGame}>Empezar Partida</button>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = game.players[game.turnIndex];

  return (
    <div className="container">
      <header className="game-header">
        <h1>Turno de: <span className="highlight">{currentPlayer?.name}</span></h1>
        <button onClick={handleDrawCard} className="draw-btn">Robar Carta</button>
      </header>
      <div className="board">
        {game.players.map((player, index) => (
          <div key={index} className={`player-zone ${index === game.turnIndex ? 'active-turn' : ''}`}>
            <h3>{player.name} {index === game.turnIndex && '🎲'}</h3>
            <div className="cards-container">
              {player.hand.length === 0 ? <p className="empty-hand">Sin cartas</p> :
                player.hand.map((card, idx) => <img key={idx} src={card.image} alt={card.value} className="card-img" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;