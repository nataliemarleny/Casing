Casing = require "Casing"

class exports.Tictactoe extends Layer
    constructor: (options = {}) ->
        _.defaults options,
            backgroundColor: null
            x: (Screen.width - Tictactoe_background.width) / 2
            y: (Screen.height - Tictactoe_background.height) / 2
        super options

        @comps =
            Tictactoe_statusbar: Tictactoe_statusbar.copy()
            Tictactoe_grid: Tictactoe_grid.copy()
            Tictactoe_o: Tictactoe_o.copy()
            Tictactoe_x: Tictactoe_x.copy()
            Tictactoe_next_x: Tictactoe_next_x.copy()
            Tictactoe_next_o: Tictactoe_next_o.copy()
            Tictactoe_field00: Tictactoe_field00.copy()
            Tictactoe_field01: Tictactoe_field01.copy()
            Tictactoe_field02: Tictactoe_field02.copy()
            Tictactoe_field10: Tictactoe_field10.copy()
            Tictactoe_field11: Tictactoe_field11.copy()
            Tictactoe_field12: Tictactoe_field12.copy()
            Tictactoe_field20: Tictactoe_field20.copy()
            Tictactoe_field21: Tictactoe_field21.copy()
            Tictactoe_field22: Tictactoe_field22.copy()
            Tictactoe_background: Tictactoe_background.copy()

        Casing.autoPosition(@, @comps.Tictactoe_grid, @comps)

        @board_fields = [
            [@comps.Tictactoe_field00, @comps.Tictactoe_field01, @comps.Tictactoe_field02]
            [@comps.Tictactoe_field10, @comps.Tictactoe_field11, @comps.Tictactoe_field12]
            [@comps.Tictactoe_field20, @comps.Tictactoe_field21, @comps.Tictactoe_field22]
        ]
        @board_symbols =
            "O": Tictactoe_o
            "X": Tictactoe_x
        @board_marks = []


    compStyles:
        borderActive:
            borderRadius: 10
            borderWidth: 3
            borderColor: "#555555"
        borderInactive:
            borderWidth: 0
        nextText:
            text: "NEXT"
            fontSize: 20
            fontWeight: "bold"
            textAlign: "center"
            color: "#555555"


    wiring_statusbar: (nextPlayer) ->
        if nextPlayer.value == "O"
            _.assign @comps.Tictactoe_o, @compStyles.borderActive
            _.assign @comps.Tictactoe_x, @compStyles.borderInactive
            @temp_Tictactoe_next_o = Casing.sizePositionApply(
                @comps.Tictactoe_next_o,
                new TextLayer @compStyles.nextText
            )
            @temp_Tictactoe_next_x?.destroy()

        if nextPlayer.value == "X"
            _.assign @comps.Tictactoe_o, @compStyles.borderInactive
            _.assign @comps.Tictactoe_x, @compStyles.borderActive
            @temp_Tictactoe_next_o?.destroy()
            @temp_Tictactoe_next_x = Casing.sizePositionApply(
                @comps.Tictactoe_next_x
                new TextLayer @compStyles.nextText
            )


    wiring_grid: (gameState) ->
        # clear previous cells
        for mark in @board_marks
            mark.destroy()
        @board_marks = []

        # fill in cells
        for row in [0..2]
            for col in [0..2]
                cellSymbol = gameState.value[row][col]
                if cellSymbol != ""
                    new_symbol = Casing.sizePositionApply(
                        @board_fields[row][col]
                        @board_symbols[cellSymbol].copy()
                    )
                    new_symbol.z = 10
                    @board_marks.push new_symbol

        # delete the winning line
        @win_line?.destroy()

        # draw the winning line
        if not _.isEqual gameState.checkWinner, {}
            {startRow, endRow, startCol, endCol} = gameState.checkWinner
            y_1 = (2 * @board_fields[startRow][0].screenFrame.y + @board_fields[startRow][0].height) / 2
            y_2 = (2 * @board_fields[endRow][0].screenFrame.y + @board_fields[endRow][0].height) / 2

            x_1 = (2 * @board_fields[0][startCol].screenFrame.x + @board_fields[0][startCol].height) / 2
            x_2 = (2 * @board_fields[0][endCol].screenFrame.x + @board_fields[0][endCol].height) / 2

            @win_line = new SVGLayer
                svg: "<svg><line x1='#{x_1}' y1='#{y_1}' x2='#{x_2}' y2='#{y_2}' style='stroke:rgb(255,98,183);stroke-width:10'/>"
                z: 10

            for comp in @comps
                comp.destroy()


    wiring_grid_press: Casing.invokeOnce (gameState, nextPlayer) ->
        @comps.Tictactoe_grid.on Events.Tap, (event) =>
            in_frame = (frame, point) ->
                return (
                    frame.x <= point.x and
                    point.x <= frame.x + frame.width and
                    frame.y <= point.y and
                    point.y <= frame.y + frame.height
                )

            for row in [0..2]
                for col in [0..2]
                    if (
                        in_frame(@board_fields[row][col].screenFrame, event) and
                        gameState.value[row][col] == "" and
                        _.isEqual gameState.checkWinner, {}
                    )
                        new_board = _.cloneDeep(gameState.value)
                        new_board[row][col] = nextPlayer.value
                        gameState.value = new_board

                        if nextPlayer.value == "O"
                            nextPlayer.value = "X"
                        else
                            nextPlayer.value = "O"
