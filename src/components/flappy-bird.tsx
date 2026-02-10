import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useColorScheme } from 'react-native';
import * as AC from '@bacons/apple-colors';

interface Bird {
  x: number;
  y: number;
  velocityY: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -12;
const PIPE_WIDTH = 60;
const PIPE_GAP = 200;
const BIRD_SIZE = 30;
const GAME_SPEED = 3;

export default function FlappyBird() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();

  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const [bird, setBird] = useState<Bird>({
    x: 100,
    y: screenHeight / 2,
    velocityY: 0,
  });

  const [pipes, setPipes] = useState<Pipe[]>([]);

  const gameLoopRef = useRef<number>();
  const frameCountRef = useRef(0);

  // Colors based on theme
  const backgroundColor = colorScheme === 'dark' ? AC.systemBackground : '#87CEEB';
  const groundColor = colorScheme === 'dark' ? '#2C2C2C' : '#DEB887';
  const pipeColor = colorScheme === 'dark' ? '#4A4A4A' : '#228B22';
  const birdColor = '#FFD700';

  const jump = () => {
    if (gameState === 'waiting') {
      setGameState('playing');
      setBird(prev => ({ ...prev, velocityY: JUMP_FORCE }));
    } else if (gameState === 'playing') {
      setBird(prev => ({ ...prev, velocityY: JUMP_FORCE }));
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  };

  const resetGame = () => {
    setGameState('waiting');
    setScore(0);
    setBird({
      x: 100,
      y: screenHeight / 2,
      velocityY: 0,
    });
    setPipes([]);
    frameCountRef.current = 0;
  };

  const generatePipe = (): Pipe => {
    const minHeight = 50;
    const maxHeight = screenHeight - PIPE_GAP - minHeight - 100; // Leave room for ground
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    return {
      x: screenWidth,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      scored: false,
    };
  };

  const checkCollision = (bird: Bird, pipes: Pipe[]): boolean => {
    // Ground collision
    if (bird.y > screenHeight - 100 - BIRD_SIZE) {
      return true;
    }

    // Ceiling collision
    if (bird.y < 0) {
      return true;
    }

    // Pipe collision
    for (const pipe of pipes) {
      if (
        bird.x + BIRD_SIZE > pipe.x &&
        bird.x < pipe.x + PIPE_WIDTH
      ) {
        if (
          bird.y < pipe.topHeight ||
          bird.y + BIRD_SIZE > pipe.bottomY
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const gameLoop = () => {
    if (gameState !== 'playing') return;

    frameCountRef.current++;

    setBird(prev => {
      const newBird = {
        ...prev,
        y: prev.y + prev.velocityY,
        velocityY: prev.velocityY + GRAVITY,
      };

      // Check collision
      if (checkCollision(newBird, pipes)) {
        setGameState('gameOver');
        if (score > highScore) {
          setHighScore(score);
        }
        return prev;
      }

      return newBird;
    });

    setPipes(prev => {
      let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - GAME_SPEED }));

      // Remove pipes that have gone off screen
      newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

      // Add new pipe every 100 frames
      if (frameCountRef.current % 100 === 0) {
        newPipes.push(generatePipe());
      }

      // Check for scoring
      newPipes.forEach(pipe => {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.scored = true;
          setScore(prev => prev + 1);
        }
      });

      return newPipes;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, bird, pipes, score]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      jump();
    },
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        position: 'relative',
      }}
      {...panResponder.panHandlers}
    >
      {/* Score */}
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <Text
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: colorScheme === 'dark' ? AC.label : '#FFF',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {score}
        </Text>
      </View>

      {/* Game Area */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Bird */}
        <View
          style={{
            position: 'absolute',
            left: bird.x,
            top: bird.y,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            backgroundColor: birdColor,
            borderRadius: BIRD_SIZE / 2,
            borderWidth: 2,
            borderColor: '#FFA500',
            transform: [{ rotate: `${Math.min(bird.velocityY * 3, 45)}deg` }],
          }}
        />

        {/* Pipes */}
        {pipes.map((pipe, index) => (
          <View key={index}>
            {/* Top Pipe */}
            <View
              style={{
                position: 'absolute',
                left: pipe.x,
                top: 0,
                width: PIPE_WIDTH,
                height: pipe.topHeight,
                backgroundColor: pipeColor,
                borderWidth: 2,
                borderColor: colorScheme === 'dark' ? '#5A5A5A' : '#006400',
              }}
            />

            {/* Bottom Pipe */}
            <View
              style={{
                position: 'absolute',
                left: pipe.x,
                top: pipe.bottomY,
                width: PIPE_WIDTH,
                height: screenHeight - pipe.bottomY - 100,
                backgroundColor: pipeColor,
                borderWidth: 2,
                borderColor: colorScheme === 'dark' ? '#5A5A5A' : '#006400',
              }}
            />
          </View>
        ))}
      </View>

      {/* Ground */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: groundColor,
          borderTopWidth: 3,
          borderTopColor: colorScheme === 'dark' ? '#3C3C3C' : '#CD853F',
        }}
      />

      {/* Game State Overlays */}
      {gameState === 'waiting' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#FFF',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Flappy Bird
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: '#FFF',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Tap to start flying!
          </Text>
          {highScore > 0 && (
            <Text
              style={{
                fontSize: 16,
                color: '#FFD700',
                textAlign: 'center',
              }}
            >
              High Score: {highScore}
            </Text>
          )}
        </View>
      )}

      {gameState === 'gameOver' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)',
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#FF0000',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Game Over!
          </Text>
          <Text
            style={{
              fontSize: 24,
              color: '#FFF',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Score: {score}
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: '#FFD700',
              textAlign: 'center',
              marginBottom: 30,
            }}
          >
            High Score: {Math.max(score, highScore)}
          </Text>
          <Pressable
            onPress={resetGame}
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 30,
              paddingVertical: 15,
              borderRadius: 25,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#FFF',
              }}
            >
              Play Again
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}