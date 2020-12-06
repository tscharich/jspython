import {
    BinOpNode, ConstNode, Ast, Token, ParserOptions, AstNode,
    OperatorsMap, OperationTypes, Operators, AssignNode,
    TokenTypes, SetSingleVarNode, GetSingleVarNode, FunctionCallNode, getTokenType, getTokenValue
} from '../common';

export class Parser {

    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param tokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parse(tokens: Token[], options: ParserOptions = { includeComments: false, includeLoc: true }): Ast {
        const ast = {
            name: "undefined.jspy",
            body: []
        } as Ast;

        if (!tokens || !tokens.length) { return ast; }

        let node: AstNode | null = null;
        if (OperatorsMap[tokens[1][0] as Operators] === OperationTypes.Assignment) {
            const target = new SetSingleVarNode(tokens[0]);
            const source = this.createNode(tokens);
            node = new AssignNode(target, source);
        } else {            
            node = this.createNode(tokens)
        }

        ast.body.push(node)
        return ast;
    }

    private getOperators(tokens: Token[]): number[] {
        const opIndexes: number[] = []

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i][0] === '(') {
                while (tokens[++i][0] !== ')') {
                    if (i + 1 >= tokens.length) {
                        throw new Error(`Closing ')' is missing`);
                    }
                }
            } else {
                const token = tokens[i];
                if (OperatorsMap[token[0] as Operators] !== undefined) {
                    opIndexes.push(i);
                }
            }
        }

        return opIndexes;
    }

    private createNode(tokens: Token[], prevNode: AstNode | null = null): AstNode {
        if (tokens.length === 0) {
            throw new Error(`Token length can't be null.`)
        }
        const firstToken = tokens[0];
        if (tokens.length === 1) {
            const tokenType = getTokenType(firstToken);

            if (tokenType === TokenTypes.LiteralString
                || tokenType === TokenTypes.LiteralNumber
                || tokenType === TokenTypes.LiteralBool
                || tokenType === TokenTypes.LiteralNull) {
                return new ConstNode(firstToken);
            } else if (tokenType === TokenTypes.Identifier) {
                return new GetSingleVarNode(firstToken);
            }

            throw Error(`Unhandled single token: '${JSON.stringify(firstToken)}'`);
        }

        const ops = this.getOperators(tokens);

        // if no operation tokens, then it is function call or chaining calls
        if (!ops.length) {
            return new FunctionCallNode(tokens);
        }

        const slice = (a: Token[], begin: number, end: number): Token[] => {
            // if expression is in brackets, then we need clean brackets
            if (getTokenValue(a[begin]) === '(') {
                begin++;
                end--;
            }

            return a.slice(begin, end);
        }

        var prevNode: AstNode | null;
        for (let i = 0; i < ops.length; i++) {
            const opIndex = ops[i];
            const op = getTokenValue(tokens[opIndex]) as Operators;
            const nextOpIndex = i + 1 < ops.length ? ops[i + 1] : null;
            
            // this code needs more revisions
            // const nextOp = nextOpIndex !== null ? getTokenValue(tokens[nextOpIndex]) : null;
            // if (nextOpIndex !== null && (nextOp === '*' || nextOp === '/')) {
            //     const nextOpIndex2 = i + 2 < ops.length ? ops[i + 2] : null;

            //     const left = prevNode || this.createNode(slice(tokens, opIndex + 1, nextOpIndex), prevNode);
            //     const right = this.createNode(slice(tokens, nextOpIndex + 1, nextOpIndex2 || tokens.length));
            //     prevNode = new BinOpNode(left, op, right);
            // } else 
            {
                const left = prevNode || this.createNode(slice(tokens, 0, opIndex), prevNode);
                const right = this.createNode(slice(tokens, opIndex + 1, nextOpIndex || tokens.length));
                prevNode = new BinOpNode(left, op, right);
            }
        }

        if (prevNode === null) {
            throw Error(`Can't create node ...`)
        }

        return prevNode;

    }
}

