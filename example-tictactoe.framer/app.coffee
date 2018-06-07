
Casing = require "Casing"

app = new Casing.App
    showPerformance: false
    dataInit:
        gameState: [
            ["", "", ""]
            ["", "", ""]
            ["", "", ""]
        ]
        nextPlayer: "O"

    dataProperties:
        checkWinner: ->
            board = @_data['_'].gameState.value

            # check rows
            for row in [0..2]
                if (board[row][0] != "") and (board[row][0] == board[row][1]) and (board[row][0] == board[row][2])
                    return {startRow: row, endRow: row, startCol: 0, endCol: 2}

            # check columns
            for col in [0..2]
                if (board[0][col] != "") and (board[0][col] == board[1][col]) and (board[0][col] == board[2][col])
                    return {startRow: 0, endRow: 2, startCol: col, endCol: col}

            # check diagonals
            if (board[0][0] != "") and (board[0][0] == board[1][1]) and (board[0][0] == board[2][2])
                return {startRow: 0, endRow: 2, startCol: 0, endCol: 2}
            if (board[2][0] != "") and (board[2][0] == board[1][1]) and (board[2][0] == board[0][2])
                return {startRow: 2, endRow: 0, startCol: 0, endCol: 2}

            return {}

app.defineComponent
    name: "Tictactoe"
    construct: Casing.constructModule "Tictactoe"
    dataLink:
        gameState: "_.gameState"
        nextPlayer: "_.nextPlayer"

app.defineScreen "screen_tictactoe", ["Tictactoe"]
app.switchScreen("screen_tictactoe")
