ace.define("ace/theme/xcode_dark",["require","exports","module","ace/lib/dom"], function(require, exports, module) {

exports.isDark = true;
exports.cssClass = "ace-xcode-dark";
exports.cssText = "\
.ace-xcode-dark .ace_gutter {\
background: #292A2F;\
color: #8F908A;\
overflow : hidden;\
}\
.ace-xcode-dark .ace_print-margin {\
width: 1px;\
background: #292A2F;\
}\
.ace-xcode-dark {\
display: block;\
overflow-x: auto;\
padding: .5em;\
color: #DFDFE0;\
background-color: #292A2F;\
}\
.ace-xcode-dark .ace_invisible {\
color: #656f81;\
}\
.ace-xcode-dark .ace_constant.ace_buildin {\
color: #EF81B0;\
}\
.ace-xcode-dark .ace_constant.ace_language {\
color: #AB83E4;\
}\
.ace-xcode-dark .ace_constant.ace_library {\
color: #E57668;\
}\
.ace-xcode-dark .ace_invalid {\
color: #F8F8F0;\
background-color: #F92672;\
}\
.ace-xcode-dark .ace_fold {\
background-color: #A6E22E;\
border-color: #F8F8F2;\
}\
.ace-xcode-dark .ace_support.ace_function {\
color: #4EB0CC;\
}\
.ace-xcode-dark .ace_support.ace_constant {\
color: #4EB0CC;\
}\
.ace-xcode-dark .ace_support.ace_other,\
.ace-xcode-dark .ace_storage.ace_type,\
.ace-xcode-dark .ace_support.ace_class,\
.ace-xcode-dark .ace_support.ace_type {\
font-style: italic;\
color: #66D9EF;\
}\
.ace-xcode-dark .ace_variable.ace_parameter {\
font-style:italic;\
color: #FD971F;\
}\
.ace-xcode-dark .ace_keyword.ace_operator {\
color: #DFDFE0;\
}\
.ace-xcode-dark .ace_comment {\
color: #A5B0BD;\
}\
.ace-xcode-dark .ace_comment.ace_doc {\
color: #75715E;\
}\
.ace-xcode-dark .ace_comment.ace_doc.ace_tag {\
color: #EF81B0;\
}\
.ace-xcode-dark .ace_constant.ace_numeric {\
color: #D5CA86;\
}\
.ace-xcode-dark .ace_variable {\
color: #BBF0E4;\
}\
.ace-xcode-dark .ace_xml-pe {\
color: rgb(104, 104, 91);\
}\
.ace-xcode-dark .ace_entity.ace_name.ace_function {\
color: #4Eb0CC;\
}\
.ace-xcode-dark .ace_heading {\
color: #DFDFE0;\
}\
.ace-xcode-dark .ace_list {\
color: #4EB0CC;\
}\
.ace-xcode-dark .ace_marker-layer .ace_selection {\
background: #49483E;\
}\
.ace-xcode-dark .ace_marker-layer .ace_step {\
background: rgb(102, 82, 0);\
}\
.ace-xcode-dark .ace_marker-layer .ace_stack {\
background: rgb(164, 229, 101);\
}\
.ace-xcode-dark .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
border: 1px solid #828C97;\
}\
.ace-xcode-dark .ace_marker-layer .ace_active-line {\
background: #202020;\
}\
.ace-xcode-dark .ace_gutter-active-line {\
background-color: #2F113239;\
}\
.ace-xcode-dark .ace_marker-layer .ace_selected-word {\
border: 1px solid #656F81;\
}\
.ace-xcode-dark .ace_storage,\
.ace-xcode-dark .ace_keyword,\
.ace-xcode-dark .ace_meta.ace_tag {\
color: #EF81B0;\
}\
.ace-xcode-dark .ace_string.ace_regex {\
color: #F08875;\
}\
.ace-xcode-dark .ace_string {\
color: #F08875;\
}\
.ace-xcode-dark .ace_entity.ace_other.ace_attribute-name {\
color: #F08875;\
}\
.ace-xcode-dark .ace_indent-guide {\
background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWPQ0FD0ZXBzd/wPAAjVAoxeSgNeAAAAAElFTkSuQmCC) right repeat-y;\
}\
.ace-xcode-dark .ace_entity.ace_other{\
color: #DFDFE0;\
}\
.ace-xcode-dark.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px #646F83;\
}\
.ace-content{\
  border-top:1px solid #43464a;\
}\
";

var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});                (function() {
                    ace.require(["ace/theme/xcode_dark"], function(m) {
                        if (typeof module == "object" && typeof exports == "object" && module) {
                            module.exports = m;
                        }
                    });
                })();







