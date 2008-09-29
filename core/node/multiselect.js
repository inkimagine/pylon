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

__MULTISELECT__ = 1 << 8;

// #ifdef __WITH_MULTISELECT

/**
 * Baseclass adding (multi) select features to this Component.
 *
 * @constructor
 * @baseclass
 * @author      Ruben Daniels
 * @version     %I%, %G%
 * @since       0.5
 */
jpf.MultiSelect = function(){
    /* ********************************************************************
                                        PROPERTIES
    *********************************************************************/
    var noEvent;
    
    this.selected    = null;
    this.$selected   = null;
    this.indicator   = null;
    this.$indicator  = null;
    
    var selSmartbinding;
    var valueList    = [];
    var selectedList = [];
    var _self        = this;
    
    this.$regbase    = this.$regbase|__MULTISELECT__;
    
    this.useindicator = true;
    
    /* ***********************
        Dynamic Properties
    ************************/
    
    /* ***********************
                ACTIONS
    ************************/
    // #ifdef __WITH_DATABINDING
    
    /**
     * Removes (selected) {@info TraverseNodes "Traverse Node(s)"} from the data of this component.
     *
     * @action
     * @param  {XMLNode}  xmlNode  optional  The XML node to be removed. If none is specified, the current selection is removed.
     * @param  {Boolean}  do_select  optional  true  the next node is selected after removal
     *                                       false  default  the selection is removed
     * @return  {Boolean}  specifies if the removal succeeded
     */
    this.remove = function(nodeList){
        //Use the current selection if no xmlNode is defined
        if (!nodeList) 
            nodeList = valueList;
        
        //If we're an xml node let's convert
        if (nodeList.nodeType)
            nodeList = [nodeList];
        
        //If there is no selection we'll exit, nothing to do
        if (!nodeList || !nodeList.length) 
            return;

        //#ifdef $DEBUG:
        //We're not removing the XMLRoot, that would be suicide ;)
        if (nodeList.contains(this.XmlRoot)) {
            throw new Error(jpf.formatErrorString(0, 
                "Removing nodes",
                "You are trying to delete the xml root of this \
                 component. This is not allowed."));
        }
        //#endif
        
        var rValue;
        if (nodeList.length > 1 && (!this.actionRules 
          || this.actionRules["removegroup"] || !this.actionRules["remove"])) {
            rValue = this.executeAction("removeNodeList", nodeList,
                "removegroup", nodeList[0]);
        }
        else {
            for (var i = 0; i < nodeList.length; i++) {
                rValue = this.executeAction("removeNode", 
                    [nodeList[i]], "remove", nodeList[i]);
            }
        }
        
        return rValue;
    };
    
    /**
     * @alias  #remove
     */
    this.removeGroup = this.remove;
    
    /**
     * Adds a new {@info TraverseNodes "Traverse Node(s)"} to the data of this component.
     *
     * @action
     * @param  {XMLNode}  xmlNode  optional  the XML node to be added. If none is specified the action will use the action rule to get the XML node to add.
     * @param  {XMLNode}  beforeNode  optional  the XML node before which <code>xmlNode</code> is inserted.
     * @param  {XMLNode}  pNode  optional  the XML node to which the <code>xmlNode</code> is added as a child.
     * @return  {Boolean}  specifies if the removal succeeded
     */
    this.add = function(xmlNode, beforeNode, pNode){
        var node = this.actionRules && this.actionRules["add"] 
            ? this.actionRules["add"][0] 
            : null;
        //if (!node)
            //throw new Error(jpf.formatErrorString(0, this, "Add Action", "Could not find Add Node"));
        
        //#ifdef __WITH_OFFLINE
        if (!jpf.offline.canTransact())
            return false;
        
        if (!jpf.offline.isOnline && (!xmlNode || !node.getAttribute("get")))
            return false;
        //#endif
        
        var jmlNode  = this; //PROCINSTR
        var callback = function(addXmlNode, state, extra){
            if (state != jpf.SUCCESS) {
                var oError;
                
                //#ifdef __DEBUG
                oError = new Error(jpf.formatErrorString(1032, jmlNode, 
                    "Loading xml data", 
                    "Could not add data for control " + jmlNode.name 
                    + "[" + jmlNode.tagName + "] \nUrl: " + extra.url 
                    + "\nInfo: " + extra.message + "\n\n" + xmlNode));
                //#endif
                
                if (extra.tpModule.retryTimeout(extra, state, jmlNode, oError) === true)
                    return true;
                
                throw oError;
            }
            
            if (typeof addXmlNode != "object")
                addXmlNode = jpf.getXmlDom(addXmlNode).documentElement;
            if (addXmlNode.getAttribute(jpf.xmldb.xmlIdTag))
                addXmlNode.setAttribute(jpf.xmldb.xmlIdTag, "");
            
            var actionNode = jmlNode.getNodeFromRule("add", jmlNode.isTreeArch
                ? jmlNode.selected
                : jmlNode.XmlRoot, true, true);
            if (!pNode && actionNode && actionNode.getAttribute("parent"))
                pNode = jmlNode.XmlRoot.selectSingleNode(actionNode.getAttribute("parent"));
            
            if (jmlNode.executeAction("appendChild", 
              [pNode || jmlNode.XmlRoot, addXmlNode, beforeNode], 
              "add", addXmlNode) !== false && jmlNode.autoselect)
                jmlNode.select(addXmlNode);
                
            return addXmlNode;
        }
        
        if (xmlNode)
            return callback(xmlNode, jpf.SUCCESS);
        else if (node.getAttribute("get"))
            return jpf.getData(node.getAttribute("get"), node, null, callback)
        else if (node.firstChild)
            return callback(jpf.getNode(node, [0]).cloneNode(true), jpf.SUCCESS);
        
        return addXmlNode;
    };
    
    /* ********************************************************************
                                        PUBLIC METHODS
    *********************************************************************/
    if (!this.setValue) {
        /**
         * Sets the value of this component.
         *
         * @param  {String}  value  required  String specifying the value to set. For components inheriting from MultiSelect a selection will be made based on the j:Value bind rule. If no item is found, the selection will be cleared.
         * @see #getValue
         */
        this.setValue = function(value, disable_event){
            noEvent = disable_event;
            this.setProperty("value", value);
            noEvent = false;
        };
    }
    
    /**
     * @private
     */
    this.findXmlNodeByValue = function(value){
        var nodes = this.getTraverseNodes();
        var bindSet = this.bindingRules && this.bindingRules[this.mainBind] 
            ? this.mainBind 
            : "caption";

        for (var i = 0; i < nodes.length; i++) {
            if (this.applyRuleSetOnNode(bindSet, nodes[i]) == value)
                return nodes[i];
        }
    };
    
    if (!this.getValue) {
        /**
         * Gets the value of this component.
         * This is the value that is used for validation of this component.
         *
         * @return  {String}  the value of this component
         * @see #setValue
         */
        this.getValue = function(xmlNode){
            if (!this.bindingRules) return false;
            
            // #ifdef __DEBUG
            if (!this.bindingRules[this.mainBind] && !this.bindingRules["caption"])
                throw new Error(jpf.formatErrorString(1074, this, 
                    "getValue Method", 
                    "Could not find default value bind rule for this control."));
            // #endif
            
            // #ifdef __WITH_MULTIBINDING
            if (!this.multiselect && !this.XmlRoot && selSmartbinding && selSmartbinding.XmlRoot) 
                return selSmartbinding.applyRuleSetOnNode(selSmartbinding.mainBind,
                    selSmartbinding.XmlRoot, null, true);
            // #endif
            
            return this.applyRuleSetOnNode(this.mainBind, xmlNode || this.selected, null, true)
                || this.applyRuleSetOnNode("caption", xmlNode || this.selected, null, true);
            
        };
    }
    
    /**
     * Sets the second level SmartBinding for Multilevel Databinding.
     * For more information see {@link MultiLevelBinding}
     *
     * @return  {SmartBinding}  
     * @see #getSelectionBindClass
     */
    this.setSelectionSmartBinding = function(smartbinding, part){
        if (!selSmartbinding)
            selSmartbinding = new jpf.MultiLevelBinding(this);
        selSmartbinding.setSmartBinding(smartbinding, part);
        
        this.dispatchEvent("initselbind", {smartbinding : selSmartbinding});
    };
    
    /**
     * Gets the second level SmartBinding for Multilevel Databinding.
     * For more information see {@link MultiLevelBinding}
     *
     * @return  {SmartBinding}  
     * @see #setSelectionBindClass
     */
    this.getSelectionSmartBinding = function(){
        return selSmartbinding;
    };
    
    // #endif
    
    /**
     * Select the current selection again.
     *
     * @todo Add support for multiselect
     */
    this.reselect = function(){
        if (this.selected) this.select(this.selected, null, this.ctrlselect,
            null, true);//no support for multiselect currently.
    };
    
    /**
     * Selects a single, or set of {@info TraverseNodes "Traverse Nodes"}.
     * The selection can be visually represented in this component.
     *
     * @param  {variant}  xmlNode  required  XMLNode   XML node to be used in the selection as a start/end point or to toggle the selection on the node.
     *                                        HTMLNode  HTML node used as visual representation of data node, to be used to determine the XML node for selection.
     *                                        string    String specifying the value of the {@info TraverseNodes "Traverse Node"} to be selected.
     * @param  {Boolean}  ctrlKey  optional  true  the Ctrl key was pressed
     *                                        false  default  otherwise
     * @param  {Boolean}  shiftKey  optional  true  the Shift key was pressed
     *                                        false  default  otherwise
     * @param  {Boolean}  fakeselect  optional  true  only visually make a selection
     *                                        false  default  otherwise
     * @param  {Boolean}  force  optional  true  force a reselect
     *                                        false  default  otherwise
     * @param  {Boolean}  noEvent  optional  true  do not call any events
     *                                        false  default  otherwise
     * @return  {Boolean}  specifying wether the selection could be made
     * @event  onbeforeselect  before a selection is made 
     * @event  onafterselect  after a selection is made
     */
    var buffered = null;
    this.select  = function(xmlNode, ctrlKey, shiftKey, fakeselect, force, noEvent){
        if (!this.selectable || this.disabled) return;
        
        if (this.ctrlselect && !shiftKey)
            ctrlKey = true;
        
        // Selection buffering (for async compatibility)
        if (!this.XmlRoot) {
            buffered        = [arguments, this.autoselect];
            this.autoselect = true;
            return;
        }
        
        if (buffered) {
            var x    = buffered;
            buffered = null;
            if (this.autoselect)
                this.autoselect = x[1];
            return this.select.apply(this, x[0]);
        }
        
        var htmlNode;

        /* **** Type Detection *****/
        if (!xmlNode) {
            //#ifdef __DEBUG
            throw new Error(jpf.formatErrorString(1075, this, 
                "Making a selection", 
                "No selection was specified"))
            //#endif

            return false;
        }

        if (typeof xmlNode != "object") {
            var str = xmlNode;
            xmlNode = jpf.xmldb.getNodeById(xmlNode);
            
            //Select based on the value of the xml node
            if (!xmlNode) {
                xmlNode = this.findXmlNodeByValue(str);
                if (!xmlNode) {
                    this.clearSelection(null, noEvent);
                    return;
                }
            }
        }
        if (!xmlNode.style)
            htmlNode = this.caching
                ? this.getNodeFromCache(xmlNode.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId)
                : document.getElementById(xmlNode.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
        else {
            var id = (htmlNode = xmlNode).getAttribute(jpf.xmldb.htmlIdTag);
            while (!id && htmlNode.parentNode)
                var id = (htmlNode = htmlNode.parentNode).getAttribute(
                    jpf.xmldb.htmlIdTag);
            
            xmlNode = jpf.xmldb.getNodeById(id, this.XmlRoot);
        }

        if(!noEvent && this.dispatchEvent('onbeforeselect', {
            xmlNode : xmlNode,
            htmlNode: htmlNode}) === false)
              return false;

        /**** Selection ****/
        
        var lastIndicator = this.indicator;
        this.indicator    = xmlNode;

        //Multiselect with SHIFT Key.
        if (shiftKey && this.multiselect) {
            var range = this.$calcSelectRange(valueList[0] || lastIndicator,
                xmlNode);

            if (this.$indicator)
                this.$deindicate(this.$indicator);
            
            this.selectList(range);
            
            this.$selected  = 
            this.$indicator = this.$indicate(htmlNode);
        }
        else if (ctrlKey && this.multiselect) { //Multiselect with CTRL Key.
            //Node will be unselected
            if (valueList.contains(xmlNode)) {
                if (!fakeselect) {
                    selectedList.remove(htmlNode);
                    valueList.remove(xmlNode);
                }
                
                if (this.selected == xmlNode) {
                    this.clearSelection(true, true);
                    
                    if (valueList.length && !fakeselect) {
                        //this.$selected = selectedList[0];
                        this.selected = valueList[0];
                    }
                }
                else
                    this.$deselect(htmlNode, xmlNode);
                
                if (htmlNode != this.$indicator)
                    this.$deindicate(this.$indicator);
                
                this.$selected  = 
                this.$indicator = this.$indicate(htmlNode);
            }
            // Node will be selected
            else {
                if (this.$indicator)
                    this.$deindicate(this.$indicator);
                this.$indicator = this.$indicate(htmlNode);
                
                this.$selected   = this.$select(htmlNode);
                this.selected     = xmlNode;
            
                if (!fakeselect) {
                    selectedList.push(htmlNode);
                    valueList.push(xmlNode);
                }
            }
        }
        else if (htmlNode && selectedList.contains(htmlNode) && fakeselect) //Return if selected Node is htmlNode during a fake select
            return;
        else { //Normal Selection
            if (!force && htmlNode && this.$selected == htmlNode
              && valueList.length <= 1 && !this.reselectable
              && selectedList.contains(htmlNode))
                return;

            if (this.$selected)
                this.$deselect(this.$selected);
            if (this.$indicator)
                this.$deindicate(this.$indicator);
            if (this.selected)
                this.clearSelection(null, true);

            this.$indicator = this.$indicate(htmlNode, xmlNode);
            this.$selected  = this.$select(htmlNode, xmlNode);
            this.selected    = xmlNode;
            
            selectedList.push(htmlNode);
            valueList.push(xmlNode);
        }

        if (!noEvent) {
            if (this.delayedselect){ 
                var jNode = this;
                setTimeout(function(){
                    jNode.dispatchEvent("afterselect", {
                        list    : valueList,
                        xmlNode : xmlNode}
                    );
                }, 10);
            }
            else
                this.dispatchEvent("afterselect", {
                    list    : valueList,
                    xmlNode : xmlNode
                });
        }
        
        return true;
    };

    /**
     * Choose a {@info TraverseNodes "Traverse Node"}.
     * The user can do this by either pressing enter or double clicking a selection of this component.
     *
     * @param  {variant}  xmlNode  required  XMLNode   XML node to be choosen.
     *                                        HTMLNode  HTML node used as visual representation of data node, to be used to determine the XML node to be choosen.
     *                                        string    String specifying the value of the {@info TraverseNodes "Traverse Node"} to be choosen.
     * @event  onbeforechoose  before a choice is made 
     * @event  onafterchoose  after a choice is made
     */
    this.choose = function(xmlNode){
        if (!this.selectable || this.disabled) return;
        
        if (this.dispatchEvent("beforechoose", {xmlNode : xmlNode}) === false)
            return false;
        
        if (xmlNode && !xmlNode.style)
            this.select(xmlNode);
        
        if (this.hasFeature(__DATABINDING__)
          && this.dispatchEvent("afterchoose", {xmlNode : this.selected}) !== false)
            this.setConnections(this.selected, "choice");
    };
    
    /**
     * Removes the selection of one or more selected nodes.
     *
     * @param  {Boolean}  singleNode  optional  true  deselect the currently indicated node
     *                                        false  default deselect all selected nodes
     * @param  {Boolean}  noEvent  optional  true  do not call any events
     *                                        false  default  otherwise
     * @event  onbeforedeselect  before a choice is made 
     * @event  onafterdeselect   after a choice is made
     */
    this.clearSelection = function(singleNode, noEvent){
        if (!this.selectable || this.disabled) return;
        
        var clSel = singleNode ? this.selected : valueList;
        if (!noEvent && this.dispatchEvent("beforedeselect", {
            xmlNode : clSel
          }) === false)
            return false;
        
        if (this.selected) {
            var htmlNode = this.caching
                ? this.getNodeFromCache(this.selected.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId)
                : document.getElementById(this.selected.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
            this.$deselect(htmlNode);
        }
        
        //if(this.$selected) this.$deselect(this.$selected);
        this.$selected = this.selected = null;
        
        if (!singleNode) {
            for (var i = valueList.length - 1; i >= 0; i--) {
                var htmlNode = this.caching
                    ? this.getNodeFromCache(valueList[i].getAttribute(
                        jpf.xmldb.xmlIdTag) + "|" + this.uniqueId)
                    : document.getElementById(valueList[i].getAttribute(
                        jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
                this.$deselect(htmlNode);
            }
            //for(var i=selectedList.length-1;i>=0;i--) this.$deselect(selectedList[i]);
            selectedList = [];
            valueList    = [];
        }
        
        if (this.indicator) {
            var htmlNode = this.caching
                ? this.getNodeFromCache(this.indicator.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId)
                : document.getElementById(this.indicator.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
            
            this.$selected  = 
            this.$indicator = this.$indicate(htmlNode);
        }
        
        if (!noEvent)
            this.dispatchEvent("afterdeselect", {xmlNode : clSel});
    };
    
    /**
     * Selects a set of nodes
     *
     * @param  {Array}  xmlNodeList  required  Array consisting of XMLNodes or HTMLNodes specifying the selection to be made.
     */
    //@todo I think there are missing events here?
    this.selectList = function(xmlNodeList, noEvent, selected){
        if (!this.selectable || this.disabled) return;
        
        if (!noEvent && this.dispatchEvent("beforeselect", {
            xmlNode : selected
          }) === false)
            return false;
        
        this.clearSelection(null, true);

        for (var sel, i=0;i<xmlNodeList.length;i++) {
            if (!xmlNodeList[i] || xmlNodeList[i].nodeType != 1) continue; //@todo fix select state in unserialize after removing
            var xmlNode = xmlNodeList[i];

            //Type Detection
            if (typeof xmlNode != "object")
                xmlNode = jpf.xmldb.getNodeById(xmlNode);
            if (!xmlNode.style)
                htmlNode = this.$findNode(null, xmlNode.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
            else {
                htmlNode = xmlNode;
                xmlNode  = jpf.xmldb.getNodeById(htmlNode.getAttribute(
                    jpf.xmldb.htmlIdTag));
            }
            
            if (!xmlNode) {
                // #ifdef __DEBUG
                jpf.console.warn("Component : " + this.name + " ["
                    + this.tagName + "]\nMessage : xmlNode whilst selecting a list of xmlNodes could not be found. Ignoring.")
                // #endif
                continue;
            }

            //Select Node
            if (htmlNode) {
                if (!sel && selected == htmlNode)
                    sel = htmlNode;
                
                this.$select(htmlNode);
                selectedList.push(htmlNode);
            }
            valueList.push(xmlNode);
        }
        
        this.$selected = sel || selectedList[0];
        this.selected   = selected || valueList[0];
        
        if (!noEvent) {
            this.dispatchEvent("afterselect", {
                list    : valueList,
                xmlNode : selected
            });
        }
    };
    
    /**
     * Sets a {@info TraverseNodes "Traverse Nodes"} as the indicator for this component.
     * The indicator is the position or 'cursor' of the selection. Using the keyboard
     * a user can change the position of the indicator using the Ctrl key and arrows whilst
     * not making a selection. When making a selection with the mouse or keyboard the indicator
     * is always set to the selected node. Unlike a selection there can be only one indicator node.
     *
     * @param  {variant}  xmlNode  required  XMLNode   XML node to be used in the selection as a start/end point or to toggle the selection on the node.
     *                                        HTMLNode  HTML node used as visual representation of data node, to be used to determine the XML node for selection.
     *                                        string    String specifying the value of the {@info TraverseNodes "Traverse Node"} to be selected.
     */
    this.setIndicator = function(xmlNode){
        /* **** Type Detection *****/
        // #ifdef __DEBUG
        if (!xmlNode)
            throw new Error(jpf.formatErrorString(1075, this, 
                "Setting indicator", 
                "Missing xmlNode reference"));
        // #endif
        
        if (typeof xmlNode != "object")
            xmlNode = jpf.xmldb.getNodeById(xmlNode);
        if (!xmlNode.style)
            htmlNode = this.caching
                ? this.getNodeFromCache(xmlNode.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId)
                : document.getElementById(xmlNode.getAttribute(
                    jpf.xmldb.xmlIdTag) + "|" + this.uniqueId); //IE55
        else {
            var id = (htmlNode = xmlNode).getAttribute(jpf.xmldb.htmlIdTag);
            while (!id && htmlNode.parentNode)
                var id = (htmlNode = htmlNode.parentNode).getAttribute(
                    jpf.xmldb.htmlIdTag);

            xmlNode = jpf.xmldb.getNodeById(id);
        }

        if (this.$indicator)
            this.$deindicate(this.$indicator);
        this.indicator  = xmlNode;
        this.$indicator = this.$indicate(htmlNode);
        
        this.dispatchEvent("indicate");
    };
    
    this.setTempSelected = function(xmlNode, ctrlKey, shiftKey){
        clearTimeout(this.timer);
            
        if (ctrlKey || this.ctrlselect) {
            if (this.$tempsel) {
                this.select(this.$tempsel);
                this.$tempsel = null;
            }
            
            this.setIndicator(xmlNode);
        }
        else if (shiftKey){
            if (this.$tempsel) {
                this.$deselect(this.$tempsel);
                this.$tempsel = null;
            }
            
            this.select(xmlNode, null, shiftKey);
        }
        else if (!this.bufferselect) {
            this.select(xmlNode);
        }
        else {
            var id = jpf.xmldb.getID(xmlNode, this);
            
            this.$deselect(this.$tempsel || this.$selected);
            this.$deindicate(this.$tempsel || this.$indicator);
            this.$tempsel = this.$indicate(document.getElementById(id));
            this.$select(this.$tempsel);
            
            this.timer = setTimeout(function(){
                _self.selectTemp();
            }, 200);
        }
    };
    
    this.selectTemp = function(){
        if (!this.$tempsel)
            return;
        
        clearTimeout(this.timer);
        this.select(this.$tempsel);
        this.$tempsel = null;
        this.timer    = null;
    };
    
    /**
     * Selects all the {@info TraverseNodes "Traverse Nodes"} of this component
     *
     */
    this.selectAll = function(){
        if (!this.multiselect || !this.selectable
          || this.disabled || !this.$selected)
            return;

        var nodes = this.getTraverseNodes();
        //this.select(nodes[0]);
        //this.select(nodes[nodes.length-1], null, true);
        this.selectList(nodes);
    };
    
    /**
     * Gets an Array or a DocumentFragment containing all the selected {@info TraverseNodes "Traverse Nodes"}
     *
     * @param  {Boolean}  xmldoc  optional  true  method returns a DocumentFragment.
     *                                    false  method returns an Array
     * @return  {variant}  current selection of this component
     */
    this.getSelection = function(xmldoc){
        if (xmldoc) {
            var r = this.XmlRoot
                ? this.XmlRoot.ownerDocument.createDocumentFragment()
                : jpf.getXmlDom().createDocumentFragment();
            for (var i = 0; i < valueList.length; i++)
                jpf.xmldb.clearConnections(r.appendChild(
                    valueList[i].cloneNode(true)));
        }
        else
            for (var r = [], i = 0; i < valueList.length; i++)
                r.push(valueList[i]);

        return r;
    };
    
    /**
     * @private
     */
    this.getSelectedNodes = function(){
        return valueList;
    };
    
    /**
     * Selectes the next {@info TraverseNodes "Traverse Node"} to be selected from
     * a given Traverse Node.
     *
     * @param  {XMLNode}  xmlNode  required  The 'context' Traverse Node.
     */
    this.defaultSelectNext = function(xmlNode, isTree){
        var next = this.getNextTraverseSelected(xmlNode);
        //if(!next && xmlNode == this.XmlRoot) return;

        //Why not use this.isTreeArch ??
        if (next || !isTree)
            this.select(next ? next : this.getTraverseParent(xmlNode));
        else
            this.clearSelection(null, true);
    };

    /**
     * Selects the next {@info TraverseNodes "Traverse Node"} when available.
     *
     * @param  {XMLNode}  xmlNode  required  The 'context' Traverse Node.
     */	
    this.selectNext = function(){
        var xmlNode = this.getNextTraverse();
        if (xmlNode)
            this.select(xmlNode);
    };
    
    /**
     * Selects the previous {@info TraverseNodes "Traverse Node"} when available.
     *
     * @param  {XMLNode}  xmlNode  required  The 'context' Traverse Node.
     * @see  SmartBinding
     */	
    this.selectPrevious = function(){
        var xmlNode = this.getNextTraverse(null, -1);
        if (xmlNode)
            this.select(xmlNode);	
    };
    
    /**
     * @private
     */
    this.getDefaultNext = function(xmlNode, isTree){
        var next = this.getNextTraverseSelected(xmlNode);
        //if(!next && xmlNode == this.XmlRoot) return;

        return (next && next != xmlNode)
            ? next
            : (isTree 
                ? this.getTraverseParent(xmlNode) 
                : null); //this.getFirstTraverseNode()
    };
    
    /**
     * Gets the number of currently selected nodes.
     *
     * @return  {Integer}  the number of currently selected nodes.
     */
    this.getSelectCount = function(){
        return valueList.length;
    };
    
    /**
     * Determines wether a node is selected.
     *
     * @param  {XMLNode}  xmlNode  required  The XMLNode to be checked.
     * @return  {Boolean}  true   the node is selected.
     *                   false  otherwise
     */
    this.isSelected = function(xmlNode){
        if (!xmlNode) return false;
        
        for (var i = 0; i < valueList.length; i++) {
            if (valueList[i] == xmlNode)
                return true;
        }
        
        return false;
    };
    
    /**
     * This function checks wether the current selection is still correct.
     * Selection can become invalid when updates to the underlying data
     * happen. For instance when a selected node is removed.
     */
    this.$checkSelection = function(nextNode){
        if (valueList.length > 1) {
            //Fix selection if needed
            for (var lst = [], i = 0, l = valueList.length; i < l; i++) {
                if (jpf.xmldb.isChildOf(this.XmlRoot, valueList[i]))
                    lst.push(valueList[i]);
            }
            
            if (lst.length > 1) {
                this.selectList(lst);
                if(this.indicator 
                  && !jpf.xmldb.isChildOf(this.XmlRoot, this.indicator)) {
                    this.setIndicator(nextNode || this.selected);
                }
                return;
            }
            else if (lst.length) {
                //this.clearSelection(null, true); //@todo noEvents here??
                nextNode = lst[0];
            }
        }

        if (!nextNode) {
            if (this.selected 
              && !jpf.xmldb.isChildOf(this.XmlRoot, this.selected)) {
                nextNode = this.getFirstTraverseNode();
            }
            else if(this.selected && this.indicator 
              && !jpf.xmldb.isChildOf(this.XmlRoot, this.indicator)) {
                this.setIndicator(this.selected);
            }
            else if (!this.selected){
                nextNode = this.XmlRoot
                    ? this.getFirstTraverseNode()
                    : null;
            }
            else {
                return; //Nothing to do
            }
        }
        
        if (nextNode) {
            if (this.autoselect) {
                this.select(nextNode);
            }
            else {
                this.clearSelection();
                this.setIndicator(nextNode);
            }
        }
        else
            this.clearSelection();
        
        //if(action == "synchronize" && this.autoselect) this.reselect();
    };
    
    /**
     * @private
     */
    this.fixScrollBug = function(){
        if (this.oInt != this.oExt)
            this.oFocus = this.oInt;
        else {
            this.oFocus = 
            this.oInt   = 
                this.oExt.appendChild(document.createElement("div"));
            
            this.oInt.style.height = "100%";
        }
    };
    
    /**
     * @attribute  {Boolean}  multiselect  true   default  The uses may select multiple nodes. Default is false for j:Dropdown.
     *                                      false  The user cannot select multiple nodes.
     * @attribute  {Boolean}  autoselect  true   default  After data is loaded in this component a selection is immediately made. Default is false for j:Dropdown.
     *                                      false  No selection is made automatically
     *                             string   all    After data is loaded in this component all {@info TraverseNodes "Traverse Nodes"} are selected.
     * @attribute  {Boolean}  selectable  true   When set to true this component can receive a selection.
     * @attribute  {Boolean}  ctrlselect  false  When set to true the user makes a selection as if it was holding the Ctrl key.
     * @attribute  {Boolean}  allowdeselect  true   When set to true the user can remove the selection of a component.
     * @attribute  {Boolean}  reselectable  false  When set to true selected nodes can be selected again such that the select events are called.
     * @attribute  {String}   selected   String specifying the value of the {@info TraverseNodes "Traverse Node"} which should be selected after loading data in this component.
     */
    this.selectable = true;
    if (this.ctrlselect === undefined)
        this.ctrlselect = false;
    if (this.multiselect === undefined)
        this.multiselect = true;
    if (this.autoselect === undefined)
        this.autoselect = true;
    if (this.delayedselect === undefined)
        this.delayedselect = true;
    if (this.allowdeselect === undefined)
        this.allowdeselect = true;
    this.reselectable = false;
    
    this.$booleanProperties["selectable"]    = true;
    this.$booleanProperties["ctrlselect"]    = true;
    this.$booleanProperties["multiselect"]   = true;
    this.$booleanProperties["autoselect"]    = true;
    this.$booleanProperties["delayedselect"] = true;
    this.$booleanProperties["allowdeselect"] = true;
    this.$booleanProperties["reselectable"]  = true;

    this.$supportedProperties.push("selectable", "ctrlselect", "multiselect", 
        "autoselect", "delayedselect", "allowdeselect", "reselectable", "value");

    this.$propHandlers["value"] = function(value){
        if (!this.bindingRules && !this.caption || !this.XmlRoot) 
            return;
    
        // #ifdef __DEBUG
        if (!this.caption && !this.bindingRules["caption"] 
          && !this.bindingRules[this.mainBind] && !this.caption)
            throw new Error(jpf.formatErrorString(1074, this, 
                "Setting the value of this component", 
                "Could not find default value bind rule for this control."))
        // #endif
        
        if (jpf.isNot(value))
            return this.clearSelection(null, noEvent);
        
        if (!this.XmlRoot)
            return this.select(value);
        
        var xmlNode = this.findXmlNodeByValue(value);
        if (xmlNode)
            this.select(xmlNode, null, null, null, null, noEvent);
        else
            return this.clearSelection(null, noEvent);
    };

    this.$propHandlers["allowdeselect"] = function(value){
        if (value) {
            var _self = this;
            this.oInt.onmousedown = function(e){
                if (!e) e = event;
                if (e.ctrlKey || e.shiftKey) 
                    return;
                
                var srcElement = jpf.hasEventSrcElement ? e.srcElement : e.target;
                if (_self.allowdeselect && (srcElement == this 
                  || srcElement.getAttribute(jpf.xmldb.htmlIdTag))) 
                    _self.clearSelection(); //hacky
            }
        }
        else {
            this.oInt.onmousedown = null;
        }
    };

    function fAutoselect(){this.selectAll();}
    this.$propHandlers["autoselect"] = function(value){
        if (value == "all" && this.multiselect) {
            this.addEventListener("afterload", fAutoselect);
        }
        else {
            this.removeEventListener("afterload", fAutoselect);
        }
    };

    this.$propHandlers["multiselect"] = function(value){
        if (!value && valueList.length > 1) {
            this.select(this.selected);
        }
    };
    
    // Select Bind class
    // #ifdef __WITH_DATABINDING
    this.addEventListener("beforeselect", function(e){
        if (this.applyRuleSetOnNode("select", e.xmlNode, ".") === false)
            return false;
    });
    // #endif
    
    // #ifdef __WITH_PROPERTY_BINDING || __WITH_OFFLINE_STATE
    this.addEventListener("afterselect", function (e){
        //#ifdef __WITH_PROPERTY_BINDING
        if (this.bindingRules && (this.bindingRules["value"] 
          || this.bindingRules["caption"]) || this.caption) {
            this.value = this.applyRuleSetOnNode(this.bindingRules && this.bindingRules["value"] 
                ? "value" 
                : "caption", e.xmlNode);

            //@todo this will also set the xml again - actually I don't think so because of this.value == value;
            this.setProperty("value", this.value); 
        }
        
        if (this.sellength != valueList.length)
            this.setProperty("sellength", valueList.length);
        //#endif
        
        //#ifdef __WITH_OFFLINE_STATE
        if (jpf.offline.state.enabled && jpf.offline.state.realtime) {  //@todo please optimize
            for (var sel = [], i = 0; i < valueList.length; i++)
                sel.push(jpf.RemoteSmartBinding.xmlToXpath(valueList[i], null, true));
            
            jpf.offline.state.set(this, "selection", sel);
            fSelState.call(this);
        }
        //#endif
    });
    // #endif
    
    //#ifdef __WITH_OFFLINE_STATE
    function fSelState(){
        if (jpf.offline.state.enabled && jpf.offline.state.realtime) {
            jpf.offline.state.set(this, "selstate", 
                [this.indicator
                    ? jpf.RemoteSmartBinding.xmlToXpath(this.indicator, null, true)
                    : "",
                 this.selected
                    ? jpf.RemoteSmartBinding.xmlToXpath(this.selected, null, true)
                    : ""]);
        }
    }
    
    this.addEventListener("indicate", fSelState);
    //#endif
};

/**
 * @private
 */
jpf.MultiSelectServer = {
    /**
     * @private
     */
    objects : {},
    
    /**
     * @private
     */
    register : function(xmlId, xmlNode, selList, jNode){
        if (!this.uniqueId)
            this.uniqueId = jpf.all.push(this) - 1;
        
        this.objects[xmlId] = {
            xml   : xmlNode,
            list  : selList,
            jNode : jNode
        };
    },
    
    $xmlUpdate : function(action, xmlNode, listenNode, UndoObj){
        if (action != "attribute") return;

        var data = this.objects[xmlNode.getAttribute(jpf.xmldb.xmlIdTag)];
        if (!data) return;

        var nodes = xmlNode.attributes;

        for (var j = 0; j < data.list.length; j++) {
            //data[j].setAttribute(UndoObj.name, xmlNode.getAttribute(UndoObj.name));
            jpf.xmldb.setAttribute(data.list[j], UndoObj.name,
                xmlNode.getAttribute(UndoObj.name));
        }
        
        //jpf.xmldb.synchronize();
    }
};

// #endif
