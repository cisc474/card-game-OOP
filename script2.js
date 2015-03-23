var theApp = angular.module("theGame",[]);

/*
  @Stack class
  *** is a stack of cards, can be shuffled, can absorb other stacks
*/
var Stack = function(arr){
  
  this.els = arr || [];
  
  this.shuffle = function(){
    var i = 0, r, temp;
    for(i = 0; i < this.els.length; i++){
      r = Math.floor(Math.random()*(this.els.length-i));
      temp = this.els[i];
      this.els[i] = this.els[this.els.length-1-r];
      this.els[this.els.length-1-r] = temp;
    }
    return this.els;
  };

  this.nextCard = function(){
    if (!this.isEmpty()){
      return this.els[this.els.length - 1];
    } else {
      return false;
    }
  };

  this.addCards = function(arr){
    this.els = this.els.concat(arr);
  };
  
  this.addStack = function(stack){
    this.addCards(stack.els);
    stack.els = [];
  };

  this.length = function(){
    return this.els.length;
  };

  this.isEmpty = function(){
    return this.els.length === 0;
  };
  
  this.drawCard = function(){
    if (this.isEmpty()){
      return false;
    } else {
      return this.els.pop();
    }
  };

  this.drawCards = function(n){
    var returnStack = new Stack([]);
    for (var i = 0; i < n; i++){
      var nextCard = this.drawCard();
      if (!nextCard){
        return returnStack;
      } else {
        returnStack.addCards([nextCard]);
      }
    }
    return returnStack;
  };
};

/*
 @Player
 *** Represents a War Player, has a deck, discard, active
 *** Knows how to shuffle discard to replenish deck
 *** if asked to draw more cards than is possible returns false
*/

var Player = function(){
  this.deck = new Stack([]);
  
  this.discard = new Stack([]);
  
  this.active = new Stack([]);
  
  this.drawCards = function(n){
    var player = this;
    var drawn = new Stack([]);
    var deck_size = player.deck.length();
    if (deck_size >= n){
      drawn = player.deck.drawCards(n);
    } else if (player.discard.length() + deck_size >= n) {
      player.discard.shuffle();
      player.deck.addStack(player.discard);
      drawn = player.deck.drawCards(n);
    } else {
      player.discard.shuffle();
      player.deck.addStack(player.discard);
      drawn = player.deck.drawCards(player.deck.length());
      player.active.addStack(drawn);
      return false;
    }
    player.active.addStack(drawn);
    return true;
  };
  
  this.totalCards = function(){
    return this.deck.length() + this.discard.length();
  };
  
  this.winCards = function(stack){
    this.discard.addStack(stack);
  };
  
  this.getCards = function(stack){
    this.deck.addStack(stack);
  };
};

/*
  @WarGame
  *** A war game model
  *** creates a standard deck, distributes cards, logs rounds
  *** in each round checks for a war and if so draws an extra four until
  *** someone is exhausted or the war is resolved
*/

var WarGame = function(){
  var game = this;
  var game_over = new Event("game-over");

  var ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
  var suits = [" of hearts", " of diamonds", " of clubs", " of spades"];
  var cards = [];

  for (var i = 0; i < ranks.length; i++){
    for (var j = 0; j < suits.length; j++){
      cards.push({ display : ranks[i] + suits[j], value : i });
    }
  }
  
  game.deck = new Stack(cards);
  game.deck.shuffle();

  game.player1 = new Player();
  game.player2 = new Player();
  
  game.log = [];
  
  game.player1.getCards(game.deck.drawCards(26));
  game.player2.getCards(game.deck.drawCards(26));  

  game.winner = false;
  game.round_winner = false;
  game.round_number = 0;
  
  game.end = function(winner){
    game.logRound();
    game.winner = winner;
  };
  
  game.logRound = function(){
    var prettyWinner = function(result){
      if (result == 1){
        return "Player 1";
      } else if (result == -1){
        return "Player 2";
      } else {
        return "NA";
      }
    };
    
    var p1a = angular.copy(game.player1.active.els);
    var p2a = angular.copy(game.player2.active.els);
    
    if (game.round_winner == 1){
      game.player1.winCards(game.player1.active);
      game.player1.winCards(game.player2.active);
    } else if (game.round_winner == -1) {
      game.player2.winCards(game.player1.active);
      game.player2.winCards(game.player2.active);
    }

    var thisRound = {
      number : game.round_number,
      p1active : p1a,
      p1total : game.player1.totalCards(),
      p2active : p2a,
      p2total : game.player2.totalCards(),
      round_winner : prettyWinner(game.round_winner)
    };
    game.log.push(thisRound);
  };
  
  game.rounds = function(n){
    for (var i = 0; (i < n) && !game.winner; i++){
      game.round();
    }
  };
  
  game.round = function(){
    game.round_number += 1;
    var winner = function(){
      var v1 = game.player1.active.nextCard().value;
      var v2 = game.player2.active.nextCard().value;
      if (v1 == v2){
        return 0;
      } else if (v1  > v2 ){
        return 1;
      } else if (v1 < v2 ){
        return -1;
      }
    };
    if (!game.player1.drawCards(1)){
      game.round_winner = -1;
      game.end("Player 2");
      return;
    }
    if (!game.player2.drawCards(1)){
      game.round_winner = 1;
      game.end("Player 1");
      return;
    }
    game.round_winner = winner();
    var counter = 0;
    var game_over = false;
    while ((game.round_winner === 0) && counter < 100){
      counter += 1;
      if (!game.player1.drawCards(4)){
        game.round_winner = -1;
        game.end("Player 2");
        game_over = true;
      }
      if (!game.player2.drawCards(4)){
        game.round_winner = 1;
        game.end("Player 1");
        game_over = true;
      }
      if (game_over){
        return;
      }
      game.round_winner = winner();
    }
    game.logRound();
  };
};

/* 
  @WarBrain
  *** This controller is the bridge between the data model 
  *** and the HTML display, index.html has most of the display
  *** logic.
*/
theApp.controller("warBrain",["$scope", function($scope){
  $scope.game = new WarGame();
  $scope.restart = function(){
    $scope.game = new WarGame();
  };
}]);