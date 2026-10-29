import React, { useState } from 'react';
import './App.css';

const SUITS = ['H', 'D', 'C', 'S']; 
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Lógica del Blackjack
const getScore = (hand) => {
  let score = 0, aces = 0;
  hand.forEach(c => {
    if (['J', 'Q', 'K'].includes(c.value)) score += 10;
    else if (c.value === 'A') { score += 11; aces += 1; }
    else score += parseInt(c.value);
  });
  while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
  return score;
};

const createDeck = () => {
  let deck = [];
  SUITS.forEach(s => {
    VALUES.forEach(v => {
      const valCode = v === '10' ? '0' : v;
      deck.push({ value: v, image: `https://deckofcardsapi.com/static/img/${valCode}${s}.png` });
    });
  });
  return deck.sort(() => Math.random() - 0.5); // Barajar
};

function App() {
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, results
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [deck, setDeck] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const addPlayer = (e) => {
    e.preventDefault();
    if (playerName.trim() && players.length < 4) {
      setPlayers([...players, { name: playerName, hand: [], status: 'playing' }]);
      setPlayerName('');
    }
  };

  const startGame = () => {
    let currentDeck = createDeck();
    let newPlayers = players.map(p => ({
      ...p,
      hand: [currentDeck.pop(), currentDeck.pop()],
      status: 'playing'
    }));
    
    setDealer([currentDeck.pop(), currentDeck.pop()]);
    setPlayers(newPlayers);
    setDeck(currentDeck);
    setTurnIndex(0);
    setGameState('playing');
  };

  const nextTurn = (updatedPlayers) => {
    if (turnIndex < updatedPlayers.length - 1) {
      setTurnIndex(turnIndex + 1);
    } else {
      playDealer(currentDeck => currentDeck, updatedPlayers);
    }
  };

  const hit = () => {
    let currentDeck = [...deck];
    let newPlayers = [...players];
    newPlayers[turnIndex].hand.push(currentDeck.pop());
    
    if (getScore(newPlayers[turnIndex].hand) > 21) {
      newPlayers[turnIndex].status = 'bust';
      setPlayers(newPlayers);
      setDeck(currentDeck);
      nextTurn(newPlayers);
    } else {
      setPlayers(newPlayers);
      setDeck(currentDeck);
    }
  };

  const stand = () => {
    let newPlayers = [...players];
    newPlayers[turnIndex].status = 'stand';
    setPlayers(newPlayers);
    nextTurn(newPlayers);
  };

  const playDealer = (getCurrentDeck, currentPlayers) => {
    let currentDeck = getCurrentDeck ? getCurrentDeck(deck) : [...deck];
    let currentDealer = [...dealer];
    
    while (getScore(currentDealer) < 17) {
      currentDealer.push(currentDeck.pop());
    }
    
    setDealer(currentDealer);
    setDeck(currentDeck);
    setPlayers(currentPlayers || players);
    setGameState('results');
  };

  const resetGame = () => setGameState('lobby');

  if (gameState === 'lobby') {
    return (
      <div className="container">
        <h1>♠️ Blackjack Local ♥️</h1>
        <div className="lobby-card">
          <h2>Jugadores ({players.length}/4)</h2>
          <form onSubmit={addPlayer}>
            <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Nombre..." />
            <button type="submit" disabled={players.length >= 4 || !playerName.trim()}>Añadir</button>
          </form>
          <ul className="player-list">{players.map((p, i) => <li key={i}>👤 {p.name}</li>)}</ul>
          {players.length > 0 && <button className="start-btn" onClick={startGame}>Repartir Cartas</button>}
        </div>
      </div>
    );
  }

  const dealerScore = getScore(dealer);

  return (
    <div className="container">
      <div className="dealer-zone">
        <h2>Croupier {gameState === 'results' ? `(Puntuación: ${dealerScore})` : ''}</h2>
        <div className="cards-container">
          {dealer.map((card, i) => (
            <img key={i} src={(i === 1 && gameState === 'playing') ? 'https://deckofcardsapi.com/static/img/back.png' : card.image} alt="carta" className="card-img" />
          ))}
        </div>
      </div>

      {gameState === 'playing' && (
        <div className="game-header">
          <h1>Turno de: <span className="highlight">{players[turnIndex].name}</span></h1>
          <div>
            <button onClick={hit} className="draw-btn" style={{marginRight: '10px'}}>Pedir</button>
            <button onClick={stand} className="stand-btn">Plantarse</button>
          </div>
        </div>
      )}

      {gameState === 'results' && (
        <button onClick={resetGame} className="start-btn" style={{marginBottom: '2rem'}}>Jugar otra vez</button>
      )}

      <div className="board">
        {players.map((player, index) => {
          const score = getScore(player.hand);
          let resultText = '';
          if (gameState === 'results') {
            if (score > 21) resultText = '❌ Te pasaste';
            else if (dealerScore > 21) resultText = '✅ Ganas (Croupier se pasó)';
            else if (score > dealerScore) resultText = '✅ Ganas';
            else if (score === dealerScore) resultText = '➖ Empate';
            else resultText = '❌ Pierdes';
          }

          return (
            <div key={index} className={`player-zone ${index === turnIndex && gameState === 'playing' ? 'active-turn' : ''}`}>
              <h3>{player.name} - {score} pts</h3>
              {resultText && <p style={{fontWeight: 'bold', color: score > 21 || (score < dealerScore && dealerScore <= 21) ? '#e74c3c' : '#2ecc71'}}>{resultText}</p>}
              <div className="cards-container">
                {player.hand.map((card, idx) => <img key={idx} src={card.image} alt="carta" className="card-img" />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;