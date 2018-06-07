# Copyright (c) 2018 Natalie Marleny
# Casing - UI framework for Framer
# License: MIT
# URL: https://github.com/nataliemarleny/Casing

# Modified code, originally from: https://github.com/ajimix/Input-Framer
# Thank you ajimix for the amazing code - you're awesome!


# Extends the LayerStyle class which does the pixel ratio calculations in framer
_inputStyle =
	Object.assign({}, Framer.LayerStyle,
		calculatePixelRatio = (layer, value) ->
			(value * layer.context.pixelMultiplier) + "px"

		fontSize: (layer) ->
			calculatePixelRatio(layer, layer._properties.fontSize)

		lineHeight: (layer) ->
			(layer._properties.lineHeight) + "em"

		padding: (layer) ->
			{ pixelMultiplier } = layer.context
			padding = []
			paddingValue = layer._properties.padding

			# Check if we have a single number as integer
			if Number.isInteger(paddingValue)
				return calculatePixelRatio(layer, paddingValue)

			# If we have multiple values they come as string (e.g. "1 2 3 4")
			paddingValues = layer._properties.padding.split(" ")

			switch paddingValues.length
				when 4
					padding.top = parseFloat(paddingValues[0])
					padding.right = parseFloat(paddingValues[1])
					padding.bottom = parseFloat(paddingValues[2])
					padding.left = parseFloat(paddingValues[3])

				when 3
					padding.top = parseFloat(paddingValues[0])
					padding.right = parseFloat(paddingValues[1])
					padding.bottom = parseFloat(paddingValues[2])
					padding.left = parseFloat(paddingValues[1])

				when 2
					padding.top = parseFloat(paddingValues[0])
					padding.right = parseFloat(paddingValues[1])
					padding.bottom = parseFloat(paddingValues[0])
					padding.left = parseFloat(paddingValues[1])

				else
					padding.top = parseFloat(paddingValues[0])
					padding.right = parseFloat(paddingValues[0])
					padding.bottom = parseFloat(paddingValues[0])
					padding.left = parseFloat(paddingValues[0])

			# Return as 4-value string (e.g "1px 2px 3px 4px")
			"#{padding.top * pixelMultiplier}px #{padding.right * pixelMultiplier}px #{padding.bottom * pixelMultiplier}px #{padding.left * pixelMultiplier}px"
	)

class exports.FrmrTextInput extends Layer
	constructor: (options = {}) ->
		_.defaults options,
			width: Screen.width / 2
			height: 60
			backgroundColor: "white"
			fontSize: 30
			lineHeight: 1
			padding: 10
			text: ""
			placeholder: ""
			type: "text"
			autoCorrect: true
			autoComplete: true
			autoCapitalize: true
			spellCheck: true
			autofocus: false
			textColor: "#000"
			fontFamily: "-apple-system"
			fontWeight: "500"
			tabIndex: 0
			textarea: false
			enabled: true

		super options

		# Add additional properties
		@_properties.fontSize = options.fontSize
		@_properties.lineHeight = options.lineHeight
		@_properties.padding = options.padding

		@placeholderColor = options.placeholderColor if options.placeholderColor?
		@input = document.createElement if options.textarea then 'textarea' else 'input'
		@input.id = "input-#{_.now()}"

		# Add styling to the input element
		_.assign @input.style,
			width: _inputStyle["width"](@)
			height: _inputStyle["height"](@)
			fontSize: _inputStyle["fontSize"](@)
			lineHeight: _inputStyle["lineHeight"](@)
			outline: "none"
			border: "none"
			backgroundColor: options.backgroundColor
			padding: _inputStyle["padding"](@)
			fontFamily: options.fontFamily
			color: options.textColor
			fontWeight: options.fontWeight

		_.assign @input,
			value: options.text
			type: options.type
			placeholder: options.placeholder

		@input.setAttribute "tabindex", options.tabindex
		@input.setAttribute "autocorrect", if options.autoCorrect then "on" else "off"
		@input.setAttribute "autocomplete", if options.autoComplete then "on" else "off"
		@input.setAttribute "autocapitalize", if options.autoCapitalize then "on" else "off"
		@input.setAttribute "spellcheck", if options.spellCheck then "on" else "off"
		if not options.enabled
			@input.setAttribute "disabled", true
		if options.autofocus
			@input.setAttribute "autofocus", true

		@form = document.createElement "form"

		@form.appendChild @input
		@_element.appendChild @form

		@backgroundColor = "transparent"
		@updatePlaceholderColor options.placeholderColor if @placeholderColor

	@define "style",
		get: -> @input.style
		set: (value) ->
			_.extend @input.style, value

	@define "value",
		get: -> @input.value
		set: (value) ->
			@input.value = value

	updatePlaceholderColor: (color) ->
		@placeholderColor = color
		if @pageStyle?
			document.head.removeChild @pageStyle
		@pageStyle = document.createElement "style"
		@pageStyle.type = "text/css"
		css = "##{@input.id}::-webkit-input-placeholder { color: #{@placeholderColor}; }"
		@pageStyle.appendChild(document.createTextNode css)
		document.head.appendChild @pageStyle

	focus: () ->
		@input.focus()

	unfocus: () ->
		@input.blur()

	onFocus: (cb) ->
		@input.addEventListener "focus", ->
			cb.apply(@)

	onUnfocus: (cb) ->
		@input.addEventListener "blur", ->
			cb.apply(@)

	disable: () ->
		@input.setAttribute "disabled", true

	enable: () =>
		@input.removeAttribute "disabled", true
