import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('lobby'); // lobby, playing
  const [deckId, setDeckId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [turnIndex, setTurnIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const addPlayer = (e) => {
    e.preventDefault();
    if (playerName.trim() && players.length < 4) {
      setPlayers([...players, { id: players.length, name: playerName, hand: [] }]);
      setPlayerName('');
    }
  };

  const startGame = async () => {
    if (players.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
      const data = await response.json();
      setDeckId(data.deck_id);
      setGameState('playing');
    } catch (error) {
      console.error("Error al crear la baraja", error);
    }
    setLoading(false);
  };

  const drawCard = async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`);
      const data = await response.json();
      
      if (data.success) {
        const newCard = data.cards[0];
        setPlayers(prevPlayers => {
          const newPlayers = [...prevPlayers];
          newPlayers[turnIndex].hand.push(newCard);
          return newPlayers;
        });
        
        // Pasar turno al siguiente jugador
        setTurnIndex((prevTurn) => (prevTurn + 1) % players.length);
      } else {
        alert("¡No quedan cartas en la baraja!");
      }
    } catch (error) {
      console.error("Error al robar carta", error);
    }
    setLoading(false);
  };

  if (gameState === 'lobby') {
    return (
      <div className="container">
        <h1>Juego de Cartas Multijugador</h1>
        <div className="lobby-card">
          <h2>Sala de Espera ({players.length}/4)</h2>
          <form onSubmit={addPlayer}>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              placeholder="Nombre del jugador..."
              disabled={players.length >= 4}
            />
            <button type="submit" disabled={players.length >= 4 || !playerName.trim()}>
              Añadir Jugador
            </button>
          </form>
          
          <ul className="player-list">
            {players.map((p, i) => <li key={i}>👤 {p.name}</li>)}
          </ul>

          {players.length > 0 && (
            <button className="start-btn" onClick={startGame} disabled={loading}>
              {loading ? 'Preparando baraja...' : 'Empezar Partida'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = players[turnIndex];

  return (
    <div className="container">
      <header className="game-header">
        <h1>Turno de: <span className="highlight">{currentPlayer.name}</span></h1>
        <button onClick={drawCard} disabled={loading} className="draw-btn">
          {loading ? 'Robando...' : 'Robar Carta'}
        </button>
      </header>

      <div className="board">
        {players.map((player, index) => (
          <div key={player.id} className={`player-zone ${index === turnIndex ? 'active-turn' : ''}`}>
            <h3>{player.name} {index === turnIndex && '🎲'}</h3>
            <div className="cards-container">
              {player.hand.length === 0 ? (
                <p className="empty-hand">Sin cartas</p>
              ) : (
                player.hand.map((card, idx) => (
                  <img key={idx} src={card.image} alt={card.value} className="card-img" />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;