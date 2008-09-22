/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

// #ifdef __JBUTTON || __INC_ALL
// #define __WITH_PRESENTATION 1
// #define __JBASEBUTTON 1

/**
 * Component displaying a clickable rectangle that visually confirms the
 * user interaction and executes a command when clicked.
 *
 * @classDescription		This class creates a new button
 * @return {Button} Returns a new button
 * @type {Button}
 * @constructor
 * @addnode components:button, components:trigger, components:submit
 * @alias submit
 * @alias trigger
 *
 * @author      Ruben Daniels
 * @version     %I%, %G%
 * @since       0.4
 *
 * @inherits jpf.Presentation
 * @inherits jpf.BaseButton
 */
jpf.submit  = 
jpf.trigger = 
jpf.button  = jpf.component(jpf.GUI_NODE, function(){
    
    // #ifdef __WITH_LANG_SUPPORT || __WITH_EDITMODE
    this.editableParts = {
        "Main": [["caption", "text()"]]
    };
    // #endif
    
    /* #ifdef __WITH_EDITMODE
     this.editableEvents = {"onclick":true}
    #endif */
     
    /**** Properties and Attributes ****/
    
    this.__focussable = true; // This object can get the focus
    this.value        = null;
    
    this.__supportedProperties.push("icon", "value", "tooltip", "state", 
        "color", "caption", "action", "target");

    this.__propHandlers["icon"] = function(value){
        if (!this.oIcon) return;
        
        if (value)
            this.__setStyleClass(this.oExt, this.baseCSSname + "Icon");
        else
            this.__setStyleClass(this.oExt, "", [this.baseCSSname + "Icon"]);
        
        if (this.oIcon.tagName == "img") 
            this.oIcon.setAttribute("src", value ? this.iconPath + value : "");
        else {
            this.oIcon.style.backgroundImage = value 
                ? "url(" + this.iconPath + value + ")"
                : "";
        }
    }
    this.__propHandlers["value"] = function(value){
        this.sValue = value;
    }
    this.__propHandlers["tooltip"] = function(value){
        this.oExt.setAttribute("title", value);
    }
    this.__propHandlers["state"] = function(value){
        this.__setStateBehaviour(value == 1);
    }
    this.__propHandlers["color"] = function(value){
        if (this.oCaption)
            this.oCaption.parentNode.style.color = value;
    }
    this.__propHandlers["caption"] = function(value){
        if (this.oCaption) 
            this.oCaption.nodeValue = value;
    }
    
    //#ifdef __JTOOLBAR
    
    function menuKeyHandler(key){
        var next, nr = jpf.xmldb.getChildNumber(this);
        if (key == 37) { //left
            next = nr == 0 
                ? this.parentNode.childNodes.length - 1 
                : nr - 1;
            this.parentNode.childNodes[next].dispatchEvent("onmouseover");
        }
        else if (key == 39) { //right
            next = (nr >= this.parentNode.childNodes.length - 1) 
                ? 0 
                : nr + 1;
            this.parentNode.childNodes[next].dispatchEvent("onmouseover");
        }
    }
    
    function menuDown(e){
        if (!e) e = event;
        
        var menu = menu;
        
        if (this.value) {
            menu.hideMenu();
            this.__setState("Over", {}, "ontoolbarover");
            
            this.parentNode.menuIsPressed = false;
            if (this.parentNode.hasMoved) 
                this.value = false;

            return;
        }
        
        this.parentNode.menuIsPressed = this;
        
        var pos = jpf.getAbsolutePosition(this.oExt, 
            menu.oExt.offsetParent || menu.oExt.parentNode); //???
        menu.oExt.style.left = pos[0] + "px";
        menu.oExt.style.top  = (pos[1] + this.oExt.offsetHeight) + "px";

        menu.showMenu();
        e.cancelBubble = true;
        
        this.parentNode.hasMoved = false;
    }
    
    function menuOver(){
        var menuPressed = this.parentNode.menuIsPressed;
        
        if (!menuPressed || menuPressed == this)
            return;
            
        menuPressed.setValue(false);
        self[menuPressed.submenu].hideMenu();
        
        this.setValue(true);
        this.parentNode.menuIsPressed = this;
        
        var pos = jpf.getAbsolutePosition(this.oExt, 
            menu.oExt.offsetParent || menu.oExt.parentNode); //???
        
        menu.display(pos[0], pos[1] + this.oExt.offsetHeight, true, this);
        
        jpf.window.__focus(this);
        
        this.parentNode.hasMoved = true;
    }
    
    /**
     * @attribute {string} submenu If this attribute is set, the button will 
     * function like a menu button
     */
    this.__propHandlers["submenu"] = function(value){
        if (!value){
            if (this.value && this.parentNode)
                menuDown.call(this);
            
            this.__focussable = true;
            this.__setNormalBehaviour();
            this.removeEventListener("onmousedown", menuDown);
            this.removeEventListener("onmouseover", menuOver);
            this.removeEventListener("onkeydown", menuKeyHandler);
            return;
        }
        
        this.__focussable = false;
        this.__setStateBehaviour();
        
        this.addEventListener("onmousedown", menuDown);
        this.addEventListener("onmouseover", menuOver);
        this.addEventListener("onkeydown", menuKeyHandler);
    }
    //#endif

    /**** Public Methods ****/
    
    /**
     * @copy   Widget#setValue
     */
    this.setValue = function(value){
        if (value === undefined) 
            value = !this.value;
        this.value = value;
        
        if (this.value) 
            this.__setStyleClass(this.oExt, this.baseCSSname + "Down", 
                [this.baseCSSname + "Over"]);
        else 
            this.__setStyleClass(this.oExt, "", [this.baseCSSname + "Down"]);
        
        this.dispatchEvent("onclick");
    }
    
    /**
     * Sets the text displayed as caption of this component.
     *
     * @param  {String}  value  required  The string to display.
     * @see    Validation
     */
    this.setCaption = function(value){
        this.setProperty("caption", value);
    }
    
    /**
     * Sets the URL of the icon displayed on this component.
     *
     * @param  {String}  value  required  The URL to the location of the icon.
     * @see    Button
     * @see    ModalWindow
     */
    this.setIcon = function(url){
        this.setProperty("icon", url);
    }
    
    /**** Private state methods ****/
    
    this.setActive = 
    this.__enable  = function(){
        this.__doBgSwitch(1);
    }
    
    this.setInactive = 
    this.__disable   = function(){
        this.__doBgSwitch(4);
        this.__setStyleClass(this.oExt, "", 
            [this.baseCSSname + "Over", this.baseCSSname + "Down"]);
    }
    
    this.__setStateBehaviour = function(value){
        this.value     = value || false;
        this.isBoolean = true;
        this.__setStyleClass(this.oExt, this.baseCSSname + "Bool");
        
        if (this.value) {
            this.__setStyleClass(this.oExt, this.baseCSSname + "Down");
            this.__doBgSwitch(this.states["Down"]);
        }
    }
    
    this.__setNormalBehaviour = function(){
        this.value     = null;
        this.isBoolean = false;
        this.__setStyleClass(this.oExt, "", [this.baseCSSname + "Bool"]);
    }
    
    this.__setState = function(state, e, strEvent){
        if (this.disabled) 
            return;

        this.__doBgSwitch(this.states[state]);
        this.__setStyleClass(this.oExt, (state != "Out" ? this.baseCSSname + state : ""),
            [(this.value ? "" : this.baseCSSname + "Down"), this.baseCSSname + "Over"]);
        this.dispatchEvent(strEvent, e);
        
        //if (state != "Down") 
            //e.cancelBubble = true;
    }
    
    this.__clickHandler = function(){
        // This handles the actual OnClick action. Return true to redraw the button.
        if (this.isBoolean) {
            this.value = !this.value;
            return true;
        }
    }
    
    //#ifdef __JTOOLBAR
    this.__hideMenu = function(){
        this.setValue(false);
        //this.oExt.onmouseout({});
        this.__setState("Out", {}, "onmouseout");
        this.parentNode.menuIsPressed = false;
    }
    //#endif
    
    /**** DOM Hooks ****/
    
    //@todo can't we make this generic for button, bar, page, divider and others, maybe in presentation
    this.__domHandlers["reparent"].push(
        function(beforeNode, pNode, withinParent){
            if (!this.__jmlLoaded)
                return;
            
            if (isUsingParentSkin && !withinParent 
              && this.skinName != pNode.skinName
              || !isUsingParentSkin 
              && this.parentNode.__getOption 
              && this.parentNode.__getOption("main", "button-skin")) {
                //@todo for now, assuming dom garbage collection doesn't leak
                this.draw();
                this.__loadJml();
                
                //Resetting properties
                var name, props = this.__supportedProperties;
                for (var i = 0; i < props.length; i++) {
                    name = props[i];
                    if (this[name] !== undefined)
                        (this.__propHandlers && this.__propHandlers[name] 
                            || jpf.JmlNode.propHandlers[name] || jpf.K).call(this, this[props[i]]);
                }
            }
        });
    
    /**** Init ****/
    
    var inited = false, isUsingParentSkin = false;
    this.draw = function(){
        var skinName;
        if (this.parentNode 
          && (skinName = this.parentNode.__getOption 
          && this.parentNode.__getOption("main", "button-skin"))) {
            isUsingParentSkin = true;
            this.loadSkin(this.parentNode.skinName.split(":")[0] + ":" + skinName);
        }
        else if(isUsingParentSkin){
            isUsingParentSkin = false;
            this.loadSkin(this.jml.getAttribute("skin") || "default:button");
        }
        
        //Build Main Skin
        this.oExt     = this.__getExternal();
        this.oIcon    = this.__getLayoutNode("main", "icon", this.oExt);
        this.oCaption = this.__getLayoutNode("main", "caption", this.oExt);
        
        this.__setupEvents();
    }
    
    this.__loadJml = function(x){
        if (!this.caption && x.firstChild)
            this.setProperty("caption", x.firstChild.nodeValue);
        
        /* #ifdef __WITH_EDITMODE
         if(this.editable)
         #endif */
        // #ifdef __WITH_LANG_SUPPORT || __WITH_EDITMODE
        this.__makeEditable("Main", this.oExt, this.jml);
        // #endif
        
        if (!inited) {
            jpf.JmlParser.parseChildren(this.jml, null, this);
            inited = true;
        }
    }
    
    //#ifdef __WITH_BUTTON_ACTIONS
    //@todo solve how this works with XForms
    this.addEventListener("onclick", function(e){
        (jpf.button.actions[this.action] || jpf.K).call(this);
    });
    //#endif
    
    /* #ifdef __WITH_XFORMS
    
    //XForms support
    if (this.tagName == "trigger") {
        this.addEventListener("onclick", function(e){
            this.dispatchXFormsEvent("DOMActivate", e);
        });
    }
    
    //XForms support
    this.action = (this.tagName == "submit") 
        ? "submit" 
        : x.getAttribute("action");
    this.target = x.getAttribute("target");
    if (this.action == "submit") 
        this.submission = x.getAttribute("submission");
    
    this.addEventListener("onclick", function(e){
        if (!this.action) 
            return;
        var target;
        
        if (this.submission) {
            var submission = self[this.submission];
            if (!submission) 
                throw new Error(jpf.formatErrorString(0, this, 
                    "Submission", 
                    "Could not find submission to execute action on '" 
                    + this.submission + "'", this.jml));
            
            submission.dispatchXFormsEvent("xforms-submit");
            
            return;
        }
        else 
            if (this.target) {
                //#ifdef __DEBUG
                if (!self[this.target]) 
                    throw new Error(jpf.formatErrorString(0, this, 
                        "Clicking on Button", 
                        "Could not find target to execute action on '" 
                        + this.target + "' with action '" 
                        + this.action + "'", this.jml));
                //#endif
                
                target = self[this.target]
            }
            else {
                var p = this;
                while (p.parentNode) {
                    if (p[this.action]) {
                        target = p;
                        break;
                    }
                    p = p.parentNode;
                };
                
                if (!target) {
                    target = this.getModel();
                    //#ifdef __DEBUG
                    if (!target) 
                        throw new Error(jpf.formatErrorString(0, this, 
                            "Clicking on Button", 
                            "Could not find target to for action '" 
                            + this.action + "'", this.jml));
                    //#endif
                }
            }
        
        //#ifdef __DEBUG
        if (!target[this.action])
            throw new Error(jpf.formatErrorString(0, this, 
                "Clicking on Button", 
                "Could not find action on target.", this.jml));
        //#endif
        
        target[this.action]();
    });
    
    //if(x.getAttribute("condition")) this.condition = x.getAttribute("condition");
    //this.form.registerButton(this.action, this);
    
    #endif*/
}).implement(jpf.Presentation, jpf.BaseButton);

//#ifdef __WITH_BUTTON_ACTIONS
jpf.button.actions = {
    // #ifdef __WITH_APP
    "undo" : function(action){
        if (this.target && self[this.target]) {
            tracker = self[this.target].getActionTracker()
        }
        else {
            var at, node = this.parentNode;
            while(node)
                at = (node = node.parentNode).__at;
        }
        
        (tracker || jpf.window.__at)[action || "undo"]();
    },
    
    "redo" : function(){
        jpf.button.actions.call(this, "redo");
    },
    //#endif
    
    //#ifdef __WITH_MULTISELECT
    "remove" : function(){
        if (this.target && self[this.target])
            self[this.target].remove()
        //#ifdef __DEBUG
        else
            jpf.console.warn("Target to remove wasn't found or specified:'" 
                             + this.target + "'");
        //#endif
    },
    
    "add" : function(){
        if (this.target && self[this.target])
            self[this.target].add()
        //#ifdef __DEBUG
        else
            jpf.console.warn("Target to add wasn't found or specified:'" 
                             + this.target + "'");
        //#endif
    },
    
    "rename" : function(){
        if (this.target && self[this.target])
            self[this.target].startRename()
        //#ifdef __DEBUG
        else
            jpf.console.warn("Target to rename wasn't found or specified:'" 
                             + this.target + "'");
        //#endif
    },
    //#endif
    
    //#ifdef __WITH_AUTH
    "login" : function(){
        var parent = this.target && self[this.target]
            ? self[this.target]
            : this.parentNode;

        var vg = parent.__validgroup || new jpf.ValidationGroup();
        if (!vg.childNodes.length)
            vg.childNodes = parent.childNodes.slice();
        
        var vars = {};
        function loopChildren(nodes){
            for (var node, i = 0, l = nodes.length; i < l; i++) {
                node = nodes[i];
                
                if (node.hasFeature(__VALIDATION__) 
                  && !node.__validgroup && !node.form) {
                    node.setProperty("validgroup", vg);
                }
                
                if (node.jml.getAttribute("type"))
                    vars[node.jml.getAttribute("type")] = node.getValue();
                
                if (vars.username && vars.password)
                    return;
            }
        }
        loopChildren(parent.childNodes);
        
        if (!vg.isValid())
            return;
        
        if (!vars.username || !vars.password) {
            //#ifdef __DEBUG
            throw new Error(jpf.formatErrorString(0, this, 
                "Clicking the login button", 
                "Could not find the username or password box"));
            //#endif
            
            return;
        }

        jpf.auth.login(vars.username, vars.password);
    },
    
    "logout" : function(){
        jpf.auth.logout();
    },
    //#endif
    
    //#ifdef __WITH_TRANSACTION
    //@todo implement and test this
    "ok" : function(){
        
    },
    
    "cancel" : function(){
        
    },
    
    "apply" : function(){
        
    },
    //#endif
    
    "close" : function(){
        var parent = this.target && self[this.target]
            ? self[this.target]
            : this.parentNode;
        
        while(parent && !parent.close)
            parent = parent.parentNode;
        
        if (parent && parent.close)
            parent.close();
        //#ifdef __DEBUG
        else
            jpf.console.warn("Target to close wasn't found or specified:'" 
                             + this.target + "'");
        //#endif
    }
}
//#endif

// #endif